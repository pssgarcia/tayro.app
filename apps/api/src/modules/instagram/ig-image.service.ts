import { Injectable, Logger } from '@nestjs/common';
import { IgImageKind } from '@prisma/client';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';

// ─── Persistência das imagens do Instagram (D-18) ────────────────────────────
//
// As URLs da CDN do Instagram são ASSINADAS E TEMPORÁRIAS: guardar o endereço
// não é guardar a imagem. Passado o prazo a CDN responde 403 e a foto some da
// tela — foi o que esvaziou a Fila com o tempo. Aqui guardamos os bytes.
//
// SSRF: a URL nunca vem do cliente. Ela sai do banco, gravada só pelo nosso
// sync a partir da API do Instagram, e ainda é validada contra a allow-list
// abaixo antes de qualquer requisição externa.

const ALLOWED_HOST_SUFFIXES = ['.cdninstagram.com', '.fbcdn.net'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const UPSTREAM_TIMEOUT_MS = 8000;
/** Teto por imagem. Sem isso, um upstream trocado enche o banco. */
const MAX_IMAGE_BYTES = 2_000_000;
/** Quantos posts do feed recente guardamos — a grade da UI mostra 6. */
export const MAX_STORED_POSTS = 6;

export interface StoredImage {
  data: Buffer;
  mimeType: string;
}

export function isAllowedImageHost(rawUrl: string): boolean {
  try {
    const { protocol, hostname } = new URL(rawUrl);
    if (protocol !== 'https:') return false;
    return ALLOWED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

@Injectable()
export class IgImageService {
  private readonly logger = new Logger(IgImageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Baixa e guarda uma imagem. **Best-effort e nunca lança**: falhar ao guardar
   * imagem não pode derrubar o sync nem apagar a imagem anterior — mesma regra
   * já aplicada à preservação de seguidores.
   */
  async fetchAndStore(
    influencerId: string,
    kind: IgImageKind,
    position: number,
    sourceUrl: string,
  ): Promise<boolean> {
    if (!isAllowedImageHost(sourceUrl)) return false;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
      let upstream: globalThis.Response;
      try {
        upstream = await fetch(sourceUrl, { signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }

      if (!upstream.ok) return false;

      // Normaliza `image/jpeg; charset=...` para comparar com a allow-list.
      const mimeType = (upstream.headers.get('content-type') ?? '')
        .split(';')[0]
        .trim()
        .toLowerCase();
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        this.logger.warn(
          `Imagem descartada (tipo não permitido: ${mimeType || 'ausente'}) para ${influencerId}`,
        );
        return false;
      }

      const data = Buffer.from(await upstream.arrayBuffer());
      if (data.byteLength === 0 || data.byteLength > MAX_IMAGE_BYTES) {
        this.logger.warn(
          `Imagem descartada (${data.byteLength} bytes, teto ${MAX_IMAGE_BYTES}) para ${influencerId}`,
        );
        return false;
      }

      // O @@unique(influencerId, kind, position) torna isto idempotente sem
      // check-then-act: re-sincronizar substitui, nunca acumula.
      await this.prisma.igImage.upsert({
        where: {
          influencerId_kind_position: { influencerId, kind, position },
        },
        create: {
          influencerId,
          kind,
          position,
          mimeType,
          byteSize: data.byteLength,
          data,
          sourceUrl,
        },
        update: {
          mimeType,
          byteSize: data.byteLength,
          data,
          sourceUrl,
          fetchedAt: new Date(),
        },
      });

      return true;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Falha ao guardar imagem ${kind}#${position} de ${influencerId}: ${reason}`,
      );
      return false;
    }
  }

  /** Lê uma imagem já guardada. `null` quando não existe. */
  async find(
    influencerId: string,
    kind: IgImageKind,
    position: number,
  ): Promise<StoredImage | null> {
    const image = await this.prisma.igImage.findUnique({
      where: { influencerId_kind_position: { influencerId, kind, position } },
      select: { data: true, mimeType: true },
    });
    if (!image) return null;
    return { data: Buffer.from(image.data), mimeType: image.mimeType };
  }

  /**
   * Entrega a imagem, gravando-a no primeiro acesso se ainda não existir.
   *
   * É o que torna a adoção gradual: creator que se candidatou antes desta
   * capacidade passa a ter imagem guardada sem script de migração e sem janela
   * de indisponibilidade.
   */
  async findOrBackfill(
    influencerId: string,
    kind: IgImageKind,
    position: number,
    sourceUrl: string | null | undefined,
  ): Promise<StoredImage | null> {
    const stored = await this.find(influencerId, kind, position);
    if (stored) return stored;
    if (!sourceUrl) return null;

    const ok = await this.fetchAndStore(influencerId, kind, position, sourceUrl);
    return ok ? this.find(influencerId, kind, position) : null;
  }

  /**
   * Guarda a foto de perfil e as thumbnails do feed de uma vez, após um sync
   * bem-sucedido. Best-effort por imagem: uma que falhe não impede as outras.
   */
  async storeFromProfile(
    influencerId: string,
    profilePicUrl: string | null,
    thumbnailUrls: (string | null | undefined)[],
  ): Promise<void> {
    const jobs: Promise<boolean>[] = [];

    if (profilePicUrl) {
      jobs.push(
        this.fetchAndStore(influencerId, IgImageKind.PROFILE, 0, profilePicUrl),
      );
    }

    thumbnailUrls.slice(0, MAX_STORED_POSTS).forEach((url, index) => {
      if (url) {
        jobs.push(
          this.fetchAndStore(influencerId, IgImageKind.POST, index, url),
        );
      }
    });

    await Promise.all(jobs);
  }
}
