/**
 * Brand style guide, expressed as prompt text.
 *
 * Every generated image goes through here so the whole blog looks like one
 * academy shot it, not a stock-photo grab bag.
 */
const BRAND_STYLE = [
  'cinematic photography, dramatic single-source rim lighting against deep near-black background',
  'colour palette strictly black, deep blood red, antique gold, bone white',
  'disciplined warrior atmosphere, serious and grounded, never cheesy or corporate',
  'Indian / South Asian athletes, Chennai training hall setting',
  'shallow depth of field, fine film grain, high contrast, sharp focus on the subject',
  'no text, no watermarks, no logos, no distorted hands or limbs',
].join(', ');

const ASPECTS = {
  featured: '16:9 wide hero composition, subject slightly off-centre with negative space for a headline',
  body: '3:2 editorial composition, mid-shot, documentary feel',
} as const;

export interface ImagePromptSpec {
  role: 'featured' | 'body';
  position: number;
  prompt: string;
  altText: string;
}

/**
 * Builds one featured prompt plus two in-body prompts from the post's own
 * title and category. Alt text is generated alongside the prompt, so no image
 * can ever reach the database without keyword-relevant alt text.
 */
export function buildImagePrompts(input: {
  title: string;
  categoryName?: string | null;
  keywords?: string[] | null;
}): ImagePromptSpec[] {
  const topic = input.title.trim();
  const category = input.categoryName?.trim() || 'martial arts and sports psychology';
  const keywords = (input.keywords ?? []).slice(0, 4).join(', ');
  const keywordClause = keywords ? `, themes: ${keywords}` : '';

  return [
    {
      role: 'featured',
      position: 0,
      prompt: `Editorial hero image for an article titled "${topic}" about ${category}${keywordClause}. ${ASPECTS.featured}. ${BRAND_STYLE}.`,
      altText: `${topic} — ${category} at Spartacus Martial Arts Academy, Chennai`,
    },
    {
      role: 'body',
      position: 1,
      prompt: `Documentary photograph illustrating the practical training side of "${topic}" (${category})${keywordClause}: an athlete mid-drill, focused, in a Chennai martial arts hall. ${ASPECTS.body}. ${BRAND_STYLE}.`,
      altText: `Athlete training drill illustrating ${topic.toLowerCase()} at a Chennai martial arts academy`,
    },
    {
      role: 'body',
      position: 2,
      prompt: `Quiet, psychological counterpart image for "${topic}" (${category})${keywordClause}: a single athlete composed and still before or after competition, eyes closed or steady gaze, breathing and resetting. ${ASPECTS.body}. ${BRAND_STYLE}.`,
      altText: `Athlete mentally resetting under pressure — ${category.toLowerCase()} coaching in Chennai`,
    },
  ];
}
