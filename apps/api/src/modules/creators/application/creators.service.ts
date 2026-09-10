import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  CampaignStatus,
  ContentStatus,
  IgFetchStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { InstagramSyncService } from '../../instagram/instagram-sync.service';
import { EmailService } from '../../email/email.service';
import { PublicApplyDto } from './dtos/public-apply.dto';
import { UpdateInfluencerDto } from './dtos/update-influencer.dto';
import { DeleteAccountDto } from './dtos/delete-account.dto';
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
  legalAcceptanceFields,
} from '../../../shared/legal/legal-documents';
import { maskEmail } from '../../../shared/utils/mask-email';

const CLAIM_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

@Injectable()
export class CreatorsService {
  private readonly logger = new Logger(CreatorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly instagramSync: InstagramSyncService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  // ─── Candidatura pública ──────────────────────────────────────────────────────

  async applyPublic(campaignId: string, dto: PublicApplyDto) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');
    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException(
        'Esta campanha não está aceitando candidaturas',
      );
    }

    const influencer = await this.findOrCreateInfluencer(dto);

    // A conta pode já existir (candidatura anterior, cadastro, apply
    // autenticado) e nunca ter registrado aceite, ou ter aceitado uma versão
    // anterior dos documentos. Este é o único ponto do fluxo público que sabe
    // que a pessoa acabou de marcar as caixas.
    await this.recordLegalAcceptance(influencer.userId);

    try {
      const application = await this.prisma.application.create({
        data: { campaignId, influencerId: influencer.id, message: dto.message },
      });

      this.instagramSync.scheduleRefresh(influencer.id);

      return { applicationId: application.id, status: application.status };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Você já se candidatou a esta campanha');
      }
      throw err;
    }
  }

  // ─── Perfil público ───────────────────────────────────────────────────────────

  async getPublicProfile(handle: string) {
    const influencer = await this.prisma.influencer.findUnique({
      where: { instagramHandle: handle.toLowerCase() },
      include: {
        applications: {
          where: { status: ApplicationStatus.APPROVED },
          orderBy: { reviewedAt: 'desc' },
          include: {
            result: true,
            campaign: {
              select: { title: true, brand: { select: { name: true } } },
            },
            submissions: {
              where: { status: ContentStatus.APPROVED },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!influencer || !influencer.publicProfileEnabled) {
      throw new NotFoundException('Perfil não encontrado');
    }

    // Regra PÚBLICA de "parceria concluída" (vision.md nº 5: nada de métrica
    // sem regra dizível): candidatura aprovada que tem conteúdo aprovado OU
    // resultado informado pela marca. As duas metades são atos da marca —
    // nenhuma é auto-declarada pela creator. O resultado entra na contagem
    // mesmo sem consentimento de vitrine: a contagem é agregada e não revela
    // marca, número nem nota, e amarrá-la ao consentimento deixaria o
    // histórico refém de a marca lembrar de marcar uma caixa.
    const completedPartnerships = influencer.applications.filter(
      (app) => app.submissions.length > 0 || app.result !== null,
    ).length;

    // A vitrine exige os DOIS consentimentos (D-21). Os flags em si não saem
    // na resposta: são controle, não conteúdo do histórico.
    const results = influencer.applications
      .filter(
        (app) => app.result?.brandAllowsPublic && !app.result.hiddenByCreator,
      )
      .map((app) => ({
        reach: app.result!.reach,
        impressions: app.result!.impressions,
        couponsUsed: app.result!.couponsUsed,
        note: app.result!.note,
        createdAt: app.result!.createdAt,
        // Quem atestou. Sem isto o número não vale nada como histórico
        // verificável — seria alcance sem autor.
        brandName: app.campaign.brand.name,
        campaignTitle: app.campaign.title,
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      id: influencer.id,
      handle: influencer.instagramHandle,
      name: influencer.name,
      avatarUrl: influencer.avatarUrl,
      igProfilePicUrl: influencer.igProfilePicUrl,
      bio: influencer.bio,
      niches: influencer.niches,
      city: influencer.city,
      followersCount: influencer.followersCount,
      igEngagementRate: influencer.igEngagementRate,
      igRecentPosts: influencer.igRecentPosts,
      igFetchStatus: influencer.igFetchStatus,
      // Sai junto do resto: `publicProfileEnabled` é o consentimento único de
      // publicar identidade + contato. Um opt-in separado só pro telefone foi
      // avaliado e recusado (Pedro, 2026-09-02) — ver spec.
      phone: influencer.phone,
      completedPartnerships,
      results,
    };
  }

  // ─── Perfil do creator autenticado (me) ─────────────────────────────────────────

  async getMe(userId: string) {
    const influencer = await this.prisma.influencer.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        // A foto que o produto inteiro mostra é a do Instagram, servida pelo
        // nosso proxy (`creatorAvatarSrc` no front). Sem ela aqui, o Perfil da
        // creator era a única tela que não tinha como mostrar a própria foto.
        igProfilePicUrl: true,
        bio: true,
        city: true,
        phone: true,
        niches: true,
        instagramHandle: true, // read-only aqui (não editável neste fluxo)
        tiktokHandle: true,
        followersCount: true,
        igEngagementRate: true,
        igFetchStatus: true,
        publicProfileEnabled: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    });
    if (!influencer) {
      throw new ForbiddenException('User does not have an influencer profile');
    }

    const { user, ...rest } = influencer;
    return { ...rest, email: user.email };
  }

  async updateMe(userId: string, dto: UpdateInfluencerDto) {
    // Monta o data só com os campos enviados — ser explícito evita sobrescrever
    // com undefined acidental. Nenhum campo aqui é @unique, então não há P2002.
    const data: Prisma.InfluencerUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.city !== undefined) data.city = dto.city;
    // Vazio limpa (null), não guarda string vazia: o front decide se mostra o
    // telefone por `phone == null`, e "" apareceria como um link tel: vazio
    // pra marca. Ver specs/creator-roster.
    if (dto.phone !== undefined) data.phone = dto.phone || null;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;
    if (dto.niches !== undefined) data.niches = dto.niches;
    if (dto.tiktokHandle !== undefined) data.tiktokHandle = dto.tiktokHandle;
    if (dto.publicProfileEnabled !== undefined) {
      data.publicProfileEnabled = dto.publicProfileEnabled;
    }

    try {
      await this.prisma.influencer.update({ where: { userId }, data });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new ForbiddenException(
          'User does not have an influencer profile',
        );
      }
      throw err;
    }

    // Retorna o mesmo shape do getMe (com email) — mantém o contrato uniforme.
    return this.getMe(userId);
  }

  // ─── Exportar dados (LGPD art. 18 II/V) ─────────────────────────────────────────

  /**
   * Tudo que a creator forneceu ou que guardamos sobre ela, num JSON só.
   * NUNCA inclui: `password` (hash), `refreshTokenHash`, `claimTokenHash`/
   * `resetTokenHash` e seus `*ExpiresAt` (segredo técnico, não dado pessoal
   * que a LGPD pede pra devolver) nem os bytes de `IgImage` (cache técnico de
   * terceiro — a `sourceUrl` e os metadados de `igRecentPosts` já cobrem "o
   * que guardamos vindo do Instagram"). O `select` explícito abaixo é a
   * garantia: nada disso é alcançável por um `include` genérico.
   */
  async exportMyData(userId: string) {
    const influencer = await this.prisma.influencer.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        bio: true,
        phone: true,
        instagramHandle: true,
        tiktokHandle: true,
        followersCount: true,
        niches: true,
        city: true,
        igEngagementRate: true,
        igRecentPosts: true,
        igProfilePicUrl: true,
        igFetchedAt: true,
        igFetchStatus: true,
        publicProfileEnabled: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            // Faz parte do que guardamos sobre a pessoa e é o registro que
            // sustenta a relação contratual: sonegá-lo da exportação seria
            // devolver menos do que temos (LGPD art. 18 II).
            acceptedTermsVersion: true,
            acceptedPrivacyVersion: true,
            acceptedAt: true,
            declaredAdultAt: true,
          },
        },
      },
    });
    if (!influencer) {
      throw new ForbiddenException('User does not have an influencer profile');
    }

    const [applications, rewards] = await Promise.all([
      this.prisma.application.findMany({
        where: { influencerId: influencer.id },
        orderBy: { appliedAt: 'desc' },
        include: {
          campaign: {
            select: {
              title: true,
              brand: { select: { name: true } },
              offerType: true,
              offerAmount: true,
              offerDeadlineDays: true,
              offerDescription: true,
              offerCommissionPercent: true,
            },
          },
          submissions: true,
          result: true,
        },
      }),
      this.prisma.reward.findMany({
        where: { influencerId: influencer.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const { user, ...profile } = influencer;
    const { email, ...legal } = user;

    return {
      exportedAt: new Date().toISOString(),
      profile: { ...profile, email },
      legalAcceptance: legal,
      applications,
      rewards,
    };
  }

  // ─── Apagar conta (LGPD art. 18 VI, D-22) ───────────────────────────────────────

  /**
   * Apaga de fato a IDENTIDADE da creator (exige a senha atual — mesma prova
   * de identidade de changePassword/changeEmail). `Application`,
   * `ContentSubmission`, `Reward` e `PartnershipResult` NÃO são cascateados:
   * ficam órfãos de identidade (o `Influencer` associado é esvaziado, mas o
   * `id` permanece estável) porque são o registro de trabalho/pagamento da
   * MARCA, não só da creator — ela também tem obrigação legal de guardar
   * isso. Ver decisions.md D-22.
   *
   * Irreversível — sem link de recuperação, diferente de
   * WithdrawModal/DeleteCampaignModal. Candidatura PENDING de campanha ainda
   * ativa vira WITHDRAWN (mesma semântica de retirar manualmente): maxSpots
   * só conta APPROVED, então isso não libera nem consome vaga, só evita uma
   * candidatura fantasma na Fila de uma conta que não existe mais.
   */
  async deleteMyAccount(userId: string, dto: DeleteAccountDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    if (!(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Senha incorreta');
    }

    const influencer = await this.prisma.influencer.findUnique({
      where: { userId },
    });
    if (!influencer) {
      throw new ForbiddenException('User does not have an influencer profile');
    }

    // Capturados ANTES da transação apagar os dois — é o par que vai no
    // e-mail de confirmação, mandado pro endereço ORIGINAL (o tombstone
    // gravado a seguir não seria alcançável).
    const originalEmail = user.email;
    const originalName = influencer.name;

    // O hash da senha ANTIGA não pode continuar guardado. `isActive: false` já
    // impede o login, mas o hash é material de credencial da pessoa: bcrypt é
    // lento, não inquebrável, e a senha dela provavelmente é reusada em outros
    // serviços. Substituímos por um hash de valor aleatório e descartado (não
    // por string vazia nem por null: a coluna é obrigatória, e um valor que
    // não é hash bcrypt válido faria `bcrypt.compare` se comportar de forma
    // imprevisível se algum caminho futuro chegasse aqui).
    const unusablePassword = await bcrypt.hash(randomUUID(), 12);

    await this.prisma.$transaction([
      this.prisma.application.updateMany({
        where: {
          influencerId: influencer.id,
          status: ApplicationStatus.PENDING,
        },
        data: { status: ApplicationStatus.WITHDRAWN },
      }),
      // Fotos cacheadas são dado pessoal (D-18) — mantê-las depois da
      // exclusão contradiria o pedido, mesmo com o Influencer esvaziado.
      this.prisma.igImage.deleteMany({
        where: { influencerId: influencer.id },
      }),
      this.prisma.influencer.update({
        where: { id: influencer.id },
        data: {
          name: 'Conta excluída', // campo obrigatório, não pode ser null
          avatarUrl: null,
          bio: null,
          phone: null,
          tiktokHandle: null,
          instagramHandle: null, // libera o @ pra uso futuro
          igProfilePicUrl: null,
          igRecentPosts: Prisma.DbNull,
          igFetchedAt: null,
          igFetchStatus: null,
          followersCount: null,
          igEngagementRate: null,
          niches: [],
          city: null,
          publicProfileEnabled: false,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          // Tombstone único: libera o endereço real pra um recadastro futuro
          // sem violar a constraint @unique.
          email: `deleted-${randomUUID()}@tayro.invalid`,
          isActive: false, // mesmo campo que login() checa — cinturão e suspensório
          password: unusablePassword,
          refreshTokenHash: null,
          claimTokenHash: null,
          claimTokenExpiresAt: null,
          resetTokenHash: null,
          resetTokenExpiresAt: null,
          // acceptedTermsVersion/acceptedPrivacyVersion/acceptedAt/
          // declaredAdultAt PERMANECEM de propósito: são o registro de que a
          // relação existiu sob determinada versão dos documentos, não dado
          // que identifique a pessoa (uma versão e um horário). Apagá-los
          // destruiria a prova do acordo justamente nos casos em que ela
          // importa. Descrito na Política de Privacidade.
        },
      }),
    ]);

    await this.emailService.sendAccountDeleted({
      to: originalEmail,
      creatorName: originalName,
    });
  }

  // ─── Aceite dos documentos legais ─────────────────────────────────────────────

  /**
   * Registra o aceite numa conta que JÁ EXISTIA quando a pessoa marcou as
   * caixas (o caminho de criação grava junto com o `user.create`).
   *
   * Não sobrescreve aceite da MESMA versão: o que vale como prova é o primeiro
   * aceite de um texto, não o mais recente. Reescrever a data a cada
   * candidatura apagaria justamente a informação de quando a pessoa concordou
   * com aquele documento.
   *
   * Versão diferente (documento republicado) re-registra: aí a pessoa está
   * aceitando um texto novo, e é esse o aceite que passa a valer.
   *
   * `declaredAdultAt` só é preenchido se estiver vazio. Declarar maioridade
   * duas vezes não é mais verdadeiro que declarar uma; a primeira data é a
   * que interessa.
   */
  private async recordLegalAcceptance(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        acceptedTermsVersion: true,
        acceptedPrivacyVersion: true,
        declaredAdultAt: true,
      },
    });
    if (!user) return;

    const data: Prisma.UserUpdateInput = {};

    const acceptedCurrent =
      user.acceptedTermsVersion === TERMS_VERSION &&
      user.acceptedPrivacyVersion === PRIVACY_VERSION;
    if (!acceptedCurrent) {
      const fields = legalAcceptanceFields();
      data.acceptedTermsVersion = fields.acceptedTermsVersion;
      data.acceptedPrivacyVersion = fields.acceptedPrivacyVersion;
      data.acceptedAt = fields.acceptedAt;
    }

    if (!user.declaredAdultAt) data.declaredAdultAt = new Date();

    if (Object.keys(data).length === 0) return;

    await this.prisma.user.update({ where: { id: userId }, data });
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────────

  private async findOrCreateInfluencer(dto: PublicApplyDto) {
    const byHandle = await this.prisma.influencer.findUnique({
      where: { instagramHandle: dto.igHandle },
    });
    if (byHandle) return byHandle;

    const userByEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (userByEmail) {
      if (userByEmail.role !== UserRole.INFLUENCER) {
        throw new ConflictException('Este e-mail já está cadastrado');
      }
      const existing = await this.prisma.influencer.findUnique({
        where: { userId: userByEmail.id },
      });

      // claimTokenHash só é zerado quando o claim é concluído — se ainda está
      // preenchido, a creator nunca definiu senha. O link antigo pode ter
      // expirado (ela reaplicando dias depois); reemite e reenvia.
      if (userByEmail.claimTokenHash && existing) {
        await this.offerAccountClaim(userByEmail.id, dto.email, existing.name);
      }

      if (existing) {
        // Preenche só o que falta — conta criada por outro caminho (cadastro,
        // apply autenticado) pode não ter handle ou telefone ainda. Nunca
        // sobrescreve um valor que a pessoa já tem.
        const missing: Prisma.InfluencerUpdateInput = {};
        if (!existing.instagramHandle) missing.instagramHandle = dto.igHandle;
        if (!existing.phone) missing.phone = dto.phone;
        if (Object.keys(missing).length > 0) {
          return this.prisma.influencer.update({
            where: { id: existing.id },
            data: missing,
          });
        }
        return existing;
      }
    }

    const randomPassword = await bcrypt.hash(randomUUID(), 10);
    const claimToken = this.generateClaimToken();
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: randomPassword,
          role: UserRole.INFLUENCER,
          claimTokenHash: claimToken.tokenHash,
          claimTokenExpiresAt: claimToken.expiresAt,
          // Conta e aceite no mesmo create. A caixa marcada em /apply/:id diz
          // que a candidatura cria uma conta no TAYRO, então este é o aceite
          // dessa conta, não um aceite genérico de formulário.
          ...legalAcceptanceFields(),
          influencer: {
            create: {
              name: dto.name,
              phone: dto.phone,
              instagramHandle: dto.igHandle,
              igFetchStatus: IgFetchStatus.PENDING,
            },
          },
        },
        include: { influencer: true },
      });

      await this.sendClaimEmailBestEffort(
        dto.email,
        user.influencer!.name,
        claimToken.rawToken,
      );

      await this.notifyAdminOfNewCreatorAccount(
        user.influencer!.name,
        dto.email,
        dto.igHandle,
      );

      return user.influencer!;
    } catch (err) {
      // Race condition: entre os findUnique acima e este create, outro request
      // concorrente pode ter criado o mesmo igHandle/email (ambos @unique). O
      // Postgres rejeita com P2002. Em vez de vazar 500, reusamos o registro
      // que o request concorrente acabou de criar.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.findExistingInfluencer(dto);
        if (existing) return existing;
      }
      throw err;
    }
  }

  /** Rebusca o influencer por handle ou email após uma colisão P2002 concorrente. */
  private async findExistingInfluencer(dto: PublicApplyDto) {
    const byHandle = await this.prisma.influencer.findUnique({
      where: { instagramHandle: dto.igHandle },
    });
    if (byHandle) return byHandle;

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { influencer: true },
    });
    return user?.influencer ?? null;
  }

  // ─── Claim de conta CLAIMABLE ─────────────────────────────────────────────────

  private generateClaimToken(): {
    rawToken: string;
    tokenHash: string;
    expiresAt: Date;
  } {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + CLAIM_TOKEN_TTL_MS);
    return { rawToken, tokenHash, expiresAt };
  }

  /** Gera um novo token, grava e reenvia o e-mail de claim (caminho de reapply). */
  private async issueClaimToken(
    userId: string,
    email: string,
    creatorName: string,
  ): Promise<void> {
    const { rawToken, tokenHash, expiresAt } = this.generateClaimToken();
    await this.prisma.user.update({
      where: { id: userId },
      data: { claimTokenHash: tokenHash, claimTokenExpiresAt: expiresAt },
    });
    await this.sendClaimEmail(email, creatorName, rawToken);
  }

  /**
   * Oferece o claim (emitir token + mandar o link) sem NUNCA derrubar quem
   * chamou. A candidatura é o evento de conversão do produto; o link de senha
   * é conveniência que a creator reobtém na próxima candidatura — inverter
   * essa prioridade custou 500 em toda primeira candidatura em produção
   * (2026-08-24, `FRONTEND_URL` ausente no Railway).
   *
   * Deliberadamente amplo: o que não pode acontecer é a candidatura morrer por
   * causa de um e-mail, seja a causa config ausente, provedor fora do ar ou
   * falha ao gravar o token.
   */
  private async offerAccountClaim(
    userId: string,
    email: string,
    creatorName: string,
  ): Promise<void> {
    try {
      await this.issueClaimToken(userId, email, creatorName);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Candidatura seguiu, mas o link de claim não foi emitido para ${maskEmail(email)}: ${reason}`,
      );
    }
  }

  private async sendClaimEmail(
    email: string,
    creatorName: string,
    rawToken: string,
  ): Promise<void> {
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    await this.emailService.sendClaimAccount({
      to: email,
      creatorName,
      claimUrl: `${frontendUrl}/claim?token=${rawToken}`,
    });
  }

  /** Mesma garantia do `offerAccountClaim`, para quem já gravou o token. */
  /**
   * Instrumentação do funil pro operador (roadmap.md AGORA #0) — visibilidade
   * de quem entra por candidatura pública, sem consultar o Neon na mão.
   * Não é a mesma classe do claim: sem `ADMIN_NOTIFICATION_EMAIL` configurada,
   * a notificação simplesmente NÃO existe (não é falha, é instrumentação
   * desligada) — por isso `config.get`, não `getOrThrow`. Dispara só na
   * criação de fato de conta+influencer, nunca em reaplicação.
   */
  private async notifyAdminOfNewCreatorAccount(
    name: string,
    email: string,
    igHandle: string,
  ): Promise<void> {
    const adminEmail = this.config.get<string>('ADMIN_NOTIFICATION_EMAIL');
    if (!adminEmail) return;

    try {
      await this.emailService.sendNewAccountNotification({
        to: adminEmail,
        role: UserRole.INFLUENCER,
        name,
        email,
        detail: `@${igHandle}`,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Candidatura seguiu, mas a notificação de conta nova pro admin falhou: ${reason}`,
      );
    }
  }

  private async sendClaimEmailBestEffort(
    email: string,
    creatorName: string,
    rawToken: string,
  ): Promise<void> {
    try {
      await this.sendClaimEmail(email, creatorName, rawToken);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Candidatura seguiu, mas o link de claim não foi enviado para ${maskEmail(email)}: ${reason}`,
      );
    }
  }
}
