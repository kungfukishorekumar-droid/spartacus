/**
 * The direct-answer paragraph.
 *
 * Sits immediately under the H1, before any storytelling, because this is the
 * block ChatGPT / Gemini / Perplexity / AI Overviews quote when they answer the
 * question the headline asks.
 */
export default function AnswerBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="answer-block mt-6">
      <p className="eyebrow">Short answer</p>
      <p className="mt-2 text-lg leading-relaxed text-bone">{children}</p>
    </div>
  );
}
