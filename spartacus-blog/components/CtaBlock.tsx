import { site } from '@/lib/site';

export default function CtaBlock() {
  return (
    <aside className="mt-14 rounded-lg border border-gold/40 bg-gradient-to-br from-char to-ink p-6 sm:p-8">
      <p className="eyebrow">Train with Coach Kishore</p>
      <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide text-bone">
        {site.tagline}
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-ash">
        Sports psychology and martial arts coaching in Chennai — for competitive athletes, for kids
        building focus and discipline, and for anyone who wants to perform when it actually counts.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={`${site.mainSiteUrl}/contact.html`} className="btn-primary" rel="noopener">
          Book a free trial class
        </a>
        <a href={`${site.mainSiteUrl}/programs.html`} className="btn-ghost" rel="noopener">
          See the programs
        </a>
      </div>
    </aside>
  );
}
