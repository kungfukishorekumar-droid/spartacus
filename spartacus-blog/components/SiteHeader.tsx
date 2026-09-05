import Link from 'next/link';
import { site } from '@/lib/site';
import type { Category } from '@/lib/types';

export default function SiteHeader({ categories }: { categories: Category[] }) {
  const pillars = categories.filter((c) => c.pillar).slice(0, 5);
  return (
    <header className="sticky top-0 z-50 border-b border-steel/80 bg-ink/95 backdrop-blur supports-[backdrop-filter]:bg-ink/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex flex-col leading-none">
          <span className="font-display text-lg font-bold uppercase tracking-[0.18em] text-bone transition group-hover:text-gold sm:text-xl">
            Spartacus
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.25em] text-gold/80">
            {site.tagline}
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
          {pillars.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="font-display text-xs font-semibold uppercase tracking-widest text-ash transition hover:text-gold"
            >
              {c.name}
            </Link>
          ))}
          <Link
            href={site.authorPagePath}
            className="font-display text-xs font-semibold uppercase tracking-widest text-ash transition hover:text-gold"
          >
            About Kishore
          </Link>
        </nav>

        <a
          href={`${site.mainSiteUrl}/contact.html`}
          className="btn-primary !px-4 !py-2 !text-xs"
          rel="noopener"
        >
          Book a Trial
        </a>
      </div>

      {/* Pillar navigation still reachable on small screens — crawlers and
          readers both get the full cluster map, no JavaScript required. */}
      <nav
        aria-label="Categories"
        className="flex gap-4 overflow-x-auto border-t border-steel/60 px-4 py-2 lg:hidden"
      >
        {pillars.map((c) => (
          <Link
            key={c.id}
            href={`/category/${c.slug}`}
            className="whitespace-nowrap font-display text-[11px] font-semibold uppercase tracking-widest text-ash transition hover:text-gold"
          >
            {c.name}
          </Link>
        ))}
      </nav>
    </header>
  );
}
