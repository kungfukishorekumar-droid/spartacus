import Image from 'next/image';
import Link from 'next/link';
import { formatDate } from '@/lib/format';
import type { Post } from '@/lib/types';

export default function PostCard({
  post,
  categoryName,
  priority = false,
}: {
  post: Post;
  categoryName?: string | null;
  priority?: boolean;
}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-steel bg-char/60 transition hover:border-gold/50">
      <Link href={`/${post.slug}`} className="relative block aspect-[16/9] overflow-hidden bg-steel">
        {post.featured_image_url ? (
          <Image
            src={post.featured_image_url}
            alt={post.featured_image_alt || post.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
            priority={priority}
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-char to-ink">
            <span className="font-display text-2xl uppercase tracking-[0.25em] text-gold/40">
              Spartacus
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        {categoryName ? <p className="eyebrow">{categoryName}</p> : null}
        <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-bone transition group-hover:text-gold">
          <Link href={`/${post.slug}`}>{post.title}</Link>
        </h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-ash">{post.excerpt}</p>
        <p className="mt-4 text-xs uppercase tracking-widest text-ash/70">
          {formatDate(post.published_at ?? post.created_at)}
        </p>
      </div>
    </article>
  );
}
