import Image from 'next/image';
import Link from 'next/link';
import { formatDate, isoDate } from '@/lib/format';
import { site } from '@/lib/site';
import type { Author } from '@/lib/types';

/**
 * The byline is a trust signal, not decoration: it names the credentials on
 * every single post and links to the author authority page, which is what
 * search and answer engines follow to verify E-E-A-T.
 */
export default function AuthorByline({
  author,
  publishedAt,
  updatedAt,
  readingMinutes,
}: {
  author: Author | null;
  publishedAt: string | null;
  updatedAt: string | null;
  readingMinutes: number;
}) {
  const name = author?.name ?? 'Kishore Kumar';
  const credentials = author?.credentials ?? [];

  return (
    <div className="flex flex-wrap items-center gap-4 border-y border-steel py-4">
      <Link href={site.authorPagePath} className="shrink-0" aria-label={`About ${name}`}>
        {author?.avatar_url ? (
          <Image
            src={author.avatar_url}
            alt={`${name} — ${author.job_title ?? 'Sports Psychologist and Martial Arts Coach'}, Chennai`}
            width={56}
            height={56}
            className="h-14 w-14 rounded-full border border-gold/50 object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/50 bg-char font-display text-lg text-gold">
            {name.charAt(0)}
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-ash">
          By{' '}
          <Link href={site.authorPagePath} className="font-semibold text-gold hover:underline">
            {name}
          </Link>
        </p>
        {credentials.length > 0 && (
          <p className="mt-1 text-xs leading-relaxed text-ash/90">{credentials.join(' · ')}</p>
        )}
        <p className="mt-1 text-xs text-ash/70">
          {publishedAt && (
            <>
              Published <time dateTime={isoDate(publishedAt)}>{formatDate(publishedAt)}</time>
            </>
          )}
          {updatedAt && updatedAt !== publishedAt && (
            <>
              {' · '}Updated <time dateTime={isoDate(updatedAt)}>{formatDate(updatedAt)}</time>
            </>
          )}
          {' · '}
          {readingMinutes} min read
        </p>
      </div>
    </div>
  );
}
