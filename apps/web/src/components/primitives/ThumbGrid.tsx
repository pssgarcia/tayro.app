import type { IgPost } from '../../types/api';

// Grade de thumbnails (6, sempre) — usada no card de candidatura (marca) e
// no perfil público da creator (/c/:handle).
export default function ThumbGrid({ posts }: { posts: IgPost[] | null }) {
  const cells = Array.from({ length: 6 }, (_, i) => posts?.[i] ?? null);
  return (
    <div className="grid grid-cols-6 gap-[5px]">
      {cells.map((post, i) =>
        post ? (
          <img
            key={i}
            src={post.thumbnail}
            alt=""
            loading="lazy"
            className="aspect-square w-full rounded-[3px] object-cover"
          />
        ) : (
          <div key={i} className="aspect-square w-full rounded-[3px] bg-plate-fill" />
        ),
      )}
    </div>
  );
}
