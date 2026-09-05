import type { PostFaq } from '@/lib/types';

/**
 * Rendered as plain server HTML (details/summary — no JavaScript), so the
 * answers are in the document for crawlers even while collapsed for readers.
 * Mirrors the FAQPage JSON-LD emitted on the same page.
 */
export default function FaqSection({ faqs }: { faqs: PostFaq[] }) {
  if (!faqs.length) return null;
  return (
    <section aria-labelledby="faq-heading" className="mt-14">
      <h2 id="faq-heading" className="font-display text-2xl font-bold uppercase tracking-wide text-bone">
        Frequently asked questions
      </h2>
      <div className="mt-2 h-0.5 w-16 bg-blood" />
      <dl className="mt-6 divide-y divide-steel border-y border-steel">
        {faqs.map((faq) => (
          <div key={faq.id} className="py-4">
            <dt>
              <details open className="group">
                <summary className="cursor-pointer list-none font-display text-base font-semibold text-gold marker:content-none">
                  {faq.question}
                </summary>
                <dd className="mt-3 text-sm leading-relaxed text-ash">{faq.answer}</dd>
              </details>
            </dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
