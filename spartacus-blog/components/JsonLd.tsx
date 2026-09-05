/**
 * Renders a JSON-LD @graph document. Server-rendered into the HTML so every
 * crawler — Googlebot, GPTBot, ClaudeBot, PerplexityBot — sees it without
 * executing JavaScript.
 */
export default function JsonLd({ json }: { json: string }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
