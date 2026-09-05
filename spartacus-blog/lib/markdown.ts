import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

marked.setOptions({ gfm: true, breaks: false });

const ALLOWED_TAGS = [
  'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'blockquote', 'ul', 'ol', 'li', 'strong', 'em', 'del', 'code', 'pre',
  'a', 'img', 'figure', 'figcaption', 'hr', 'br',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

/**
 * Markdown → sanitised HTML.
 *
 * H1 is deliberately NOT allowed: the page renders exactly one H1 (the post
 * title), which is what both Google and answer engines key on.
 */
export async function renderMarkdown(md: string): Promise<string> {
  const raw = await marked.parse(md ?? '');
  return sanitizeHtml(raw, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'title', 'rel', 'target'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      th: ['colspan', 'rowspan', 'scope'],
      td: ['colspan', 'rowspan'],
      '*': ['id'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    transformTags: {
      // External links open in a new tab and never pass link equity by accident.
      a: (tagName, attribs) => {
        const href = attribs.href ?? '';
        const isExternal = /^https?:\/\//i.test(href) && !href.includes('spartacusmartialarts.com');
        return {
          tagName,
          attribs: isExternal
            ? { ...attribs, target: '_blank', rel: 'noopener noreferrer' }
            : attribs,
        };
      },
      img: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, loading: 'lazy', alt: attribs.alt ?? '' },
      }),
    },
  });
}

/** Plain text, for word counts and truncation. */
export function stripMarkdown(md: string): string {
  return (md ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function readingTimeMinutes(md: string): number {
  const words = stripMarkdown(md).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/**
 * Every site-relative href in the body — the raw material for the internal
 * linking check that runs at publish time.
 */
export function extractInternalLinks(md: string): string[] {
  const links = new Set<string>();
  const markdownLink = /\[[^\]]*\]\((\/[^)\s]*)\)/g;
  const htmlLink = /href\s*=\s*["'](\/[^"']*)["']/g;
  for (const re of [markdownLink, htmlLink]) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(md ?? '')) !== null) {
      links.add(match[1].split('#')[0].replace(/\/$/, '') || '/');
    }
  }
  return [...links];
}
