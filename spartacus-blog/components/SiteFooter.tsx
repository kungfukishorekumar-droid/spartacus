import Link from 'next/link';
import { site } from '@/lib/site';
import type { Category } from '@/lib/types';

export default function SiteFooter({ categories }: { categories: Category[] }) {
  return (
    <footer className="mt-20 border-t border-steel bg-char">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold uppercase tracking-[0.18em] text-bone">
            {site.name}
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ash">{site.description}</p>
          <p className="mt-4 eyebrow">{site.tagline}</p>
        </div>

        <div>
          <p className="eyebrow">Pillars</p>
          <ul className="mt-4 space-y-2">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/category/${c.slug}`} className="text-sm text-ash transition hover:text-gold">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="eyebrow">Academy</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href={site.authorPagePath} className="text-ash transition hover:text-gold">
                About Coach Kishore
              </Link>
            </li>
            <li>
              <a href={site.mainSiteUrl} className="text-ash transition hover:text-gold" rel="noopener">
                Main website
              </a>
            </li>
            <li>
              <a
                href={`${site.mainSiteUrl}/programs.html`}
                className="text-ash transition hover:text-gold"
                rel="noopener"
              >
                Programs
              </a>
            </li>
            <li>
              <a
                href={`${site.mainSiteUrl}/contact.html`}
                className="text-ash transition hover:text-gold"
                rel="noopener"
              >
                Book a free trial
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-steel/70 px-4 py-5 text-center text-xs text-ash/70 sm:px-6">
        © {new Date().getFullYear()} {site.name}, Chennai. All rights reserved.
      </div>
    </footer>
  );
}
