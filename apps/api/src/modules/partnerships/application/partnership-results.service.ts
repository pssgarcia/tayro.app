import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ApplicationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { EmailService } from '../../email/email.service';
import { CreatePartnershipResultDto } from './dtos/create-partnership-result.dto';
import { UpdatePartnershipResultDto } from './dtos/update-partnership-result.dto';
import { SetResultVisibilityDto } from './dtos/set-result-visibility.dto';

/**
 * Identidade da creator numa listagem de parcerias.
 *
 * Deliberadamente MENOR que o `influencerSelect` da Fila: `igRecentPosts` é um
 * JSON de posts e este select roda pra toda parceria aprovada da campanha.
 * Mesmo motivo que fez os bytes de imagem morarem em tabela separada (D-18) —
 * listagem não arrasta blob.
 */
const partnershipInfluencerSelect = {
  id: true,
  name: true,
  avatarUrl: true,
  instagramHandle: true,
  igProfilePicUrl: true,
} as const;

/** Campos que carregam o conteúdo do resultado (o resto é visibilidade). */
type ResultContent = {
  reach?: number | null;
  impressions?: number | null;
  couponsUsed?: number | null;
  note?: string | null;
};

@Injectable()
export class PartnershipResultsService {
  private readonly logger = new Logger(PartnershipResultsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // ─── Marca ─────────────────────────────────────────────────────────────────

  /**
   * Registra o resultado de uma parceria. Este ato É a atestação (D-21): não
   * existe passo extra de "concluir" — os números ficam marcados como
   * informados pela marca em toda superfície que os mostra, porque não são
   * medidos por nós (vision.md nº 5).
   */
  async create(userId: string, dto: CreatePartnershipResultDto) {
    const application = await this.findApprovedPartnershipOrFail(
      dto.applicationId,
      userId,
    );

    const note = normalizeNote(dto.note);
    this.assertHasContent({ ...dto, note });

    let created;
    try {
      created = await this.prisma.partnershipResult.create({
        data: {
          applicationId: dto.applicationId,
          reach: dto.reach ?? null,
          impressions: dto.impressions ?? null,
          couponsUsed: dto.couponsUsed ?? null,
          note,
          // Publicar é escolha ativa, nunca efeito colateral de registrar.
          brandAllowsPublic: dto.brandAllowsPublic ?? false,
        },
      });
    } catch (err) {
      // A unique de `applicationId` é a única fonte de verdade contra
      // duplicata — sem leitura prévia, não há janela entre checar e escrever
      // (mesmo padrão do cadastro de creator/marca).
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'Esta parceria já tem resultado registrado. Edite o que existe',
        );
      }
      throw err;
    }

    // O aviso é o que torna a transparência real em vez de depender de a
    // creator abrir o app — mas o resultado JÁ está gravado neste ponto.
    // `catch` próprio, e não a confiança em o EmailService nunca lançar:
    // deixar a exceção subir daqui devolveria 500 pra uma operação que deu
    // certo, e a marca registraria de novo achando que falhou. Foi exatamente
    // essa forma de bug que derrubou a 1ª candidatura de creator nova em
    // 2026-08-24 (um `getOrThrow` acima do best-effort).
    try {
      await this.emailService.sendPartnershipResult({
        to: application.influencer.user.email,
        creatorName: application.influencer.name,
        campaignTitle: application.campaign.title,
        brandName: application.campaign.brand.name,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Resultado ${created.id} gravado, mas o aviso à creator falhou: ${reason}`,
      );
    }

    return created;
  }

  /** Corrige números que chegaram errados ou tarde, e liga/desliga a vitrine. */
  async update(id: string, userId: string, dto: UpdatePartnershipResultDto) {
    const existing = await this.findOwnedResultOrFail(id, userId);

    // Só os campos enviados entram no data — ser explícito evita sobrescrever
    // com `undefined` acidental.
    const data: Prisma.PartnershipResultUpdateInput = {};
    if (dto.reach !== undefined) data.reach = dto.reach;
    if (dto.impressions !== undefined) data.impressions = dto.impressions;
    if (dto.couponsUsed !== undefined) data.couponsUsed = dto.couponsUsed;
    if (dto.note !== undefined) data.note = normalizeNote(dto.note);
    if (dto.brandAllowsPublic !== undefined) {
      data.brandAllowsPublic = dto.brandAllowsPublic;
    }

    // A regra vale sobre o resultado DEPOIS da edição: apagar o último número
    // por PATCH deixaria uma parceria "com resultado" sem resultado nenhum.
    // Lido do DTO, não do `data` montado acima, porque os tipos de update do
    // Prisma admitem forma de operação ({ set: ... }) e não só o valor.
    this.assertHasContent({
      reach: pick(dto.reach, existing.reach),
      impressions: pick(dto.impressions, existing.impressions),
      couponsUsed: pick(dto.couponsUsed, existing.couponsUsed),
      note: dto.note !== undefined ? normalizeNote(dto.note) : existing.note,
    });

    return this.prisma.partnershipResult.update({ where: { id }, data });
  }

  /**
   * Apaga o resultado. Ao contrário da recompensa, não há gate de status: o
   * dado é declarado pela marca e corrigir um resultado atribuído à creator
   * errada não pode depender de nada. A creator já pode tê-lo visto — a
   * consequência é dita na confirmação da interface, não escondida aqui.
   */
  async remove(id: string, userId: string) {
    await this.findOwnedResultOrFail(id, userId);
    await this.prisma.partnershipResult.delete({ where: { id } });
  }

  /**
   * Parcerias (candidaturas aprovadas) da campanha, com o resultado de cada
   * uma ou `null`. Quem não tem resultado continua na lista: é dessa ausência
   * que sai o "pendente" na interface da marca.
   */
  async findByCampaign(campaignId: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { brand: { select: { userId: true } } },
    });

    if (!campaign) throw new NotFoundException('Campanha não encontrada');
    if (campaign.brand.userId !== userId) {
      throw new ForbiddenException('Not your campaign');
    }

    const partnerships = await this.prisma.application.findMany({
      where: { campaignId, status: ApplicationStatus.APPROVED },
      orderBy: { reviewedAt: 'desc' },
      include: {
        influencer: { select: partnershipInfluencerSelect },
        result: true,
      },
    });

    return partnerships.map((p) => ({
      applicationId: p.id,
      reviewedAt: p.reviewedAt,
      influencer: p.influencer,
      result: p.result,
    }));
  }

  // ─── Creator ───────────────────────────────────────────────────────────────

  /**
   * Resultados que a creator recebeu. SEM filtro de visibilidade: a marca não
   * escolhe se ela vê — registrar é devolver (D-21, diferencial nº 3). Os dois
   * flags saem na resposta porque ela precisa saber o que dá pra publicar.
   */
  async findMine(userId: string) {
    const influencer = await this.findInfluencerOrFail(userId);

    const results = await this.prisma.partnershipResult.findMany({
      where: { application: { influencerId: influencer.id } },
      orderBy: { createdAt: 'desc' },
      include: {
        application: {
          select: {
            id: true,
            campaign: {
              select: {
                id: true,
                title: true,
                brand: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    // Achatado de propósito: a tela da creator precisa de marca e campanha, e
    // de nada mais do agregado — o mesmo motivo do flatten de e-mail em
    // `CreatorsService.getMe`.
    return results.map((r) => ({
      id: r.id,
      applicationId: r.application.id,
      campaignId: r.application.campaign.id,
      campaignTitle: r.application.campaign.title,
      brandName: r.application.campaign.brand.name,
      reach: r.reach,
      impressions: r.impressions,
      couponsUsed: r.couponsUsed,
      note: r.note,
      brandAllowsPublic: r.brandAllowsPublic,
      hiddenByCreator: r.hiddenByCreator,
      createdAt: r.createdAt,
    }));
  }

  /**
   * A creator esconde (ou mostra) um resultado no próprio perfil público.
   * É opt-out item a item: o consentimento base de publicar continua sendo o
   * `publicProfileEnabled` dela (D-06). Esta rota nunca toca no consentimento
   * da marca.
   */
  async setVisibility(id: string, userId: string, dto: SetResultVisibilityDto) {
    const influencer = await this.findInfluencerOrFail(userId);

    const result = await this.prisma.partnershipResult.findUnique({
      where: { id },
      include: { application: { select: { influencerId: true } } },
    });

    if (!result) throw new NotFoundException('Resultado não encontrado');
    if (result.application.influencerId !== influencer.id) {
      throw new ForbiddenException('Not your partnership');
    }

    return this.prisma.partnershipResult.update({
      where: { id },
      data: { hiddenByCreator: dto.hidden },
    });
  }

  // ─── Helpers privados ──────────────────────────────────────────────────────

  /**
   * Resultado exige parceria: candidatura APROVADA de uma campanha desta
   * marca. Uma única consulta traz dono, status e os dados do e-mail.
   */
  private async findApprovedPartnershipOrFail(
    applicationId: string,
    userId: string,
  ) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            brand: { select: { userId: true, name: true } },
          },
        },
        influencer: {
          select: { id: true, name: true, user: { select: { email: true } } },
        },
      },
    });

    if (!application) throw new NotFoundException('Candidatura não encontrada');
    if (application.campaign.brand.userId !== userId) {
      throw new ForbiddenException('Not your campaign');
    }
    if (application.status !== ApplicationStatus.APPROVED) {
      throw new BadRequestException(
        'Só candidatura aprovada tem resultado de parceria',
      );
    }

    return application;
  }

  private async findOwnedResultOrFail(id: string, userId: string) {
    const result = await this.prisma.partnershipResult.findUnique({
      where: { id },
      include: {
        application: {
          include: { campaign: { include: { brand: true } } },
        },
      },
    });

    if (!result) throw new NotFoundException('Resultado não encontrado');
    if (result.application.campaign.brand.userId !== userId) {
      throw new ForbiddenException('Not your campaign');
    }
    return result;
  }

  private async findInfluencerOrFail(userId: string) {
    const influencer = await this.prisma.influencer.findUnique({
      where: { userId },
    });
    if (!influencer) {
      throw new ForbiddenException('User does not have an influencer profile');
    }
    return influencer;
  }

  /**
   * Resultado sem nenhum número e sem observação não é resultado — seria uma
   * linha que faz a parceria contar como concluída sem dizer nada. Vale no
   * create e no estado final do update.
   */
  private assertHasContent(content: ResultContent) {
    const hasNumber = [
      content.reach,
      content.impressions,
      content.couponsUsed,
    ].some((v) => v !== null && v !== undefined);
    const hasNote =
      typeof content.note === 'string' && content.note.trim().length > 0;

    if (!hasNumber && !hasNote) {
      throw new BadRequestException(
        'Informe ao menos um número ou uma observação sobre a parceria',
      );
    }
  }
}

/** String vazia nunca é persistida: viraria uma citação em branco na vitrine. */
function normalizeNote(note?: string | null): string | null {
  const trimmed = note?.trim();
  return trimmed ? trimmed : null;
}

/** Valor depois da edição: o enviado, ou o que já estava lá. */
function pick<T>(incoming: T | undefined, current: T): T {
  return incoming === undefined ? current : incoming;
}
