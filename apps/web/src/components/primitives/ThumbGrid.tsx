import type { IgPost } from '../../types/api';
import { creatorPostSrc } from '../../utils/format';

// Grade de thumbnails (6, sempre) — usada no card de candidatura (marca) e
// no perfil público da creator (/c/:handle).
//
// Precisa do `influencerId` porque a imagem vem do NOSSO domínio, não da CDN:
// as URLs do Instagram expiram e o feed sumia da tela (D-18).
export default function ThumbGrid({
  posts,
  influencerId,
}: {
  posts: IgPost[] | null;
  influencerId: string;
}) {
  const cells = Array.from({ length: 6 }, (_, i) => posts?.[i] ?? null);
  return (
    <div className="grid grid-cols-6 gap-[5px]">
      {cells.map((post, i) =>
        post ? (
          <img
            key={i}
            src={creatorPostSrc(influencerId, i)}
            alt=""
            loading="lazy"
            className="aspect-square w-full rounded-[3px] object-cover"
          />
        ) : (
          <div key={i} className="aspect-square w-full bg-[#cfcfc8]" />
        ),
      )}
    </div>
  );
}
