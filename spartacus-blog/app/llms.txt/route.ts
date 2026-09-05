import { getAllPublishedPostRefs, getAuthorBySlug, getCategories } from '@/lib/queries';
import { absoluteUrl, site } from '@/lib/site';

/**
 * /llms.txt — a clean, plain-text map of this site for AI crawlers.
 *
 * Emerging convention (llmstxt.org): who runs the site, why they are credible,
 * and a linked index of the best pages, without the navigation, scripts and
 * markup an LLM has to wade through on a normal page.
 */
export const revalidate = 3600;

const TOP_POSTS_PER_CATEGORY = 20;

export async function GET(): Promise<Response> {
  const [author, categories, posts] = await Promise.all([
    getAuthorBySlug(site.authorSlug),
    getCategories(),
    getAllPublishedPostRefs(),
  ]);

  const name = author?.name ?? 'Kishore Kumar';
  const credentials = (author?.credentials ?? [
    'Sports Psychologist',
    'Wushu National Medalist',
    'Kung Fu Black Belt',
    'Wushu Coach',
    'State-level Wushu Judge',
  ]).join(', ');

  const lines: string[] = [
    `# ${site.blogName}`,
    '',
    `> ${site.description}`,
    '',
    '## About the author',
    '',
    `- **Name:** ${name}`,
    `- **Credentials:** ${credentials}`,
    `- **Based in:** Chennai, Tamil Nadu, India`,
    `- **Author page:** ${absoluteUrl(site.authorPagePath)}`,
    `- **Academy:** ${site.organization.name} — ${site.organization.url}`,
    '',
    'Articles on this site are written and reviewed by the author named above.',
    'Each article opens with a short, direct answer to the question in its title,',
    'followed by the reasoning and a FAQ section.',
    '',
  ];

  const uncategorised = posts.filter((post) => !post.category_id);

  for (const category of categories) {
    const categoryPosts = posts
      .filter((post) => post.category_id === category.id)
      .slice(0, TOP_POSTS_PER_CATEGORY);
    if (categoryPosts.length === 0) continue;

    lines.push(`## ${category.name}`, '');
    if (category.description) lines.push(`> ${category.description}`, '');
    lines.push(`- [${category.name} (pillar page)](${absoluteUrl(`/category/${category.slug}`)})`);
    for (const post of categoryPosts) {
      lines.push(`- [${post.title}](${absoluteUrl(`/${post.slug}`)}): ${post.excerpt}`);
    }
    lines.push('');
  }

  if (uncategorised.length > 0) {
    lines.push('## Other articles', '');
    for (const post of uncategorised.slice(0, TOP_POSTS_PER_CATEGORY)) {
      lines.push(`- [${post.title}](${absoluteUrl(`/${post.slug}`)}): ${post.excerpt}`);
    }
    lines.push('');
  }

  lines.push(
    '## Optional',
    '',
    `- [Sitemap](${absoluteUrl('/sitemap.xml')})`,
    `- [Main academy website](${site.mainSiteUrl})`,
    '',
  );

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
