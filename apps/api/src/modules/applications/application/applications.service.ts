import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationStatus, CampaignStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { InstagramSyncService } from '../../instagram/instagram-sync.service';
import { EmailService } from '../../email/email.service';
import { CreateApplicationDto } from './dtos/create-application.dto';

// Campos de IG incluídos em todas as respostas de application que expõem o influencer.
//
// Exportado só pra ser TESTÁVEL: os bytes das imagens (IgImage) não podem
// entrar aqui — este select roda em toda listagem da Fila, e arrastar imagem
// em cada consulta é o motivo de elas viverem em tabela separada (D-18).
export const influencerSelect = {
  id: true,
  name: true,
  avatarUrl: true,
  instagramHandle: true,
  niches: true,
  city: true,
  followersCount: true,
  igEngagementRate: true,
  igRecentPosts: true,
  igProfilePicUrl: true,
  igFetchStatus: true,
} as const;

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly instagramSync: InstagramSyncService,
    private readonly emailService: EmailService,
  ) {}

  async create(userId: string, dto: CreateApplicationDto) {
    const influencer = await this.findInfluencerOrFail(userId);

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: dto.campaignId },
      include: {
        _count: {
          select: {
            applications: { where: { status: ApplicationStatus.APPROVED } },
          },
        },
      },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Campaign is not accepting applications');
    }
    if (campaign._count.applications >= campaign.maxSpots) {
      throw new BadRequestException('Campaign is full');
    }

    try {
      const application = await this.prisma.application.create({
        data: {
          campaignId: dto.campaignId,
          influencerId: influencer.id,
          message: dto.message,
        },
      });

      // A creator já existe, mas o perfil dela pode estar velho — ou nunca ter
      // sido buscado, se ela entrou pelo cadastro. Ninguém deve chegar na Fila
      // da marca sem ao menos uma tentativa. Respeita o staleness de 24h, então
      // candidatura com dado fresco não toca no provedor.
      this.instagramSync.scheduleRefresh(influencer.id);

      return application;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Already applied to this campaign');
      }
      throw err;
    }
  }

  async findMine(userId: string) {
    const influencer = await this.findInfluencerOrFail(userId);

    return this.prisma.application.findMany({
      where: { influencerId: influencer.id },
      orderBy: { appliedAt: 'desc' },
      include: {
        campaign: {
          select: {
            title: true,
            rewardType: true,
            rewardValue: true,
            offerType: true,
            offerAmount: true,
            offerDeadlineDays: true,
            offerDescription: true,
            offerCommissionPercent: true,
            status: true,
            deadline: true,
            brand: { select: { name: true, logoUrl: true } },
          },
        },
      },
    });
  }

  async findByCampaign(campaignId: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { brand: true },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.brand.userId !== userId)
      throw new ForbiddenException('Not your campaign');

    return this.prisma.application.findMany({
      where: { campaignId },
      orderBy: { appliedAt: 'desc' },
      include: {
        influencer: { select: influencerSelect },
        _count: { select: { submissions: true } },
      },
    });
  }

  async approve(id: string, userId: string) {
    const application = await this.findWithCampaignOrFail(id);

    if (application.campaign.brand.userId !== userId)
      throw new ForbiddenException('Not your campaign');
    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Application is not pending');
    }

    // Race condition: dois approves concorrentes podem ler approvedCount antes
    // de qualquer um commitar e ambos estourar maxSpots. O check + update vão
    // numa transação Serializable: o Postgres garante execução equivalente a
    // serial — o segundo lê o count já atualizado e é rejeitado.
    const maxSpots = application.campaign.maxSpots;
    let updated;
    try {
      updated = await this.prisma.$transaction(
        async (tx) => {
          const approvedCount = await tx.application.count({
            where: {
              campaignId: application.campaignId,
              status: ApplicationStatus.APPROVED,
            },
          });
          if (approvedCount >= maxSpots) {
            throw new BadRequestException('Campaign is full');
          }
          // `status` no WHERE, não só `id`: a checagem de PENDING lá em cima
          // vale pro instante da LEITURA. Sem isto, um reject concorrente que
          // leu a mesma linha ainda pendente sobrescreve esta aprovação —
          // e-mail de aprovação já enviado, status REJECTED na tela, vaga
          // liberada em silêncio. P2025 = ninguém casou o filtro.
          return tx.application.update({
            where: { id, status: ApplicationStatus.PENDING },
            data: {
              status: ApplicationStatus.APPROVED,
              reviewedAt: new Date(),
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      // P2034 = serialization failure / write conflict. Sob alta concorrência o
      // Postgres aborta uma das transações em conflito — tratamos como "cheio".
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2034'
      ) {
        throw new BadRequestException('Campaign is full');
      }
      throw this.asDecisionConflict(err);
    }

    // Best-effort: EmailService nunca lança — falha de e-mail não derruba o approve.
    await this.emailService.sendApplicationApproved({
      to: application.influencer.user.email,
      creatorName: application.influencer.name,
      campaignTitle: application.campaign.title,
      brandName: application.campaign.brand.name,
    });

    return updated;
  }

  async reject(id: string, userId: string) {
    const application = await this.findWithCampaignOrFail(id);

    if (application.campaign.brand.userId !== userId)
      throw new ForbiddenException('Not your campaign');
    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Application is not pending');
    }

    // Ver comentário em approve(): o status entra no WHERE pra que duas
    // decisões concorrentes resolvam numa só.
    let updated;
    try {
      updated = await this.prisma.application.update({
        where: { id, status: ApplicationStatus.PENDING },
        data: { status: ApplicationStatus.REJECTED, reviewedAt: new Date() },
      });
    } catch (err) {
      throw this.asDecisionConflict(err);
    }

    await this.emailService.sendApplicationRejected({
      to: application.influencer.user.email,
      creatorName: application.influencer.name,
      campaignTitle: application.campaign.title,
      brandName: application.campaign.brand.name,
    });

    return updated;
  }

  async withdraw(id: string, userId: string) {
    const influencer = await this.findInfluencerOrFail(userId);
    const application = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!application) throw new NotFoundException('Application not found');
    if (application.influencerId !== influencer.id)
      throw new ForbiddenException('Not your application');
    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException(
        'Only pending applications can be withdrawn',
      );
    }

    try {
      return await this.prisma.application.update({
        where: { id, status: ApplicationStatus.PENDING },
        data: { status: ApplicationStatus.WITHDRAWN },
      });
    } catch (err) {
      throw this.asDecisionConflict(err);
    }
  }

  /**
   * Traduz o P2025 das escritas condicionais (`where: { id, status: PENDING }`)
   * em 409 — a candidatura foi decidida por outra requisição entre a leitura e
   * a escrita desta. Qualquer outro erro passa intacto.
   */
  private asDecisionConflict(err: unknown): unknown {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2025'
    ) {
      return new ConflictException(
        'Esta candidatura já foi decidida — recarregue para ver o status atual',
      );
    }
    return err;
  }

  /**
   * Dispara refresh manual dos dados de IG da creator.
   * Requer: brand dona da campanha.
   * Cooldown: rejeita se houve tentativa nos últimos IG_REFRESH_COOLDOWN_MINUTES
   * (independente de FAILED/OK — cada chamada pode custar na RapidAPI).
   */
  async refreshInfluencerIg(applicationId: string, userId: string) {
    const application = await this.findWithCampaignOrFail(applicationId);

    if (application.campaign.brand.userId !== userId) {
      throw new ForbiddenException('Not your campaign');
    }

    const influencer = await this.prisma.influencer.findUnique({
      where: { id: application.influencerId },
      select: { id: true, igFetchedAt: true },
    });

    if (!influencer) throw new NotFoundException('Influencer not found');

    const cooldownMs =
      parseInt(
        this.config.get<string>('IG_REFRESH_COOLDOWN_MINUTES', '15'),
        10,
      ) * 60_000;
    const lastAttempt = influencer.igFetchedAt;

    if (lastAttempt && Date.now() - lastAttempt.getTime() < cooldownMs) {
      const waitMin = Math.ceil(
        (cooldownMs - (Date.now() - lastAttempt.getTime())) / 60_000,
      );
      throw new HttpException(
        {
          message: `Aguarde ${waitMin} minuto(s) antes de tentar novamente`,
          waitMinutes: waitMin,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.instagramSync.refresh(influencer.id, { force: true });

    return this.prisma.influencer.findUnique({
      where: { id: influencer.id },
      select: influencerSelect,
    });
  }

  // ─── Helpers privados ────────────────────────────────────────────────────────

  private async findInfluencerOrFail(userId: string) {
    const influencer = await this.prisma.influencer.findUnique({
      where: { userId },
    });
    if (!influencer)
      throw new ForbiddenException('User does not have an influencer profile');
    return influencer;
  }

  private async findWithCampaignOrFail(id: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        campaign: { include: { brand: true } },
        influencer: { include: { user: { select: { email: true } } } },
      },
    });
    if (!application) throw new NotFoundException('Application not found');
    return application;
  }
}
