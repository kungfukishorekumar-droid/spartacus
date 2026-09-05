import { absoluteUrl, site } from './site';
import { stripMarkdown } from './markdown';
import type { Author, Category, FullPost, Post, PostFaq } from './types';

/**
 * JSON-LD generators.
 *
 * This is the single highest-leverage technical item in the build: it is how
 * Google, ChatGPT, Gemini, Perplexity and Claude confirm WHO is answering and
 * why they should trust the answer (E-E-A-T). Every page type below emits it.
 */

type Json = Record<string, unknown>;

// Anchored to the MAIN domain, not the blog's mount point: the academy is one
// organisation whether the blog sits on a subdomain or at /blog. If the main
// site also emits Organization schema, both must use this same @id or engines
// see two rival entities.
const ORG_ID = `${site.mainSiteUrl}/#organization`;
const SITE_ID = absoluteUrl('/#website');
const PERSON_ID = absoluteUrl(`${site.authorPagePath}#person`);

function clean<T extends Json>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ) as T;
}

export function organizationSchema(): Json {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: site.organization.name,
    url: site.organization.url,
    logo: { '@type': 'ImageObject', url: absoluteUrl(site.logo) },
    areaServed: site.organization.areaServed,
    sameAs: site.organization.sameAs,
    founder: { '@id': PERSON_ID },
  };
}

export function websiteSchema(): Json {
  return {
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: site.url,
    name: site.blogName,
    description: site.description,
    inLanguage: site.language,
    publisher: { '@id': ORG_ID },
  };
}

/**
 * The author authority record. Credentials are emitted both as `knowsAbout`
 * and as `hasCredential` entries so engines can cite the qualification, not
 * just the name.
 */
export function personSchema(author: Author | null): Json {
  const name = author?.name ?? 'Kishore Kumar';
  const credentials = author?.credentials ?? [];
  return clean({
    '@type': 'Person',
    '@id': PERSON_ID,
    name,
    url: absoluteUrl(site.authorPagePath),
    jobTitle: author?.job_title ?? 'Sports Psychologist & Martial Arts Coach',
    description: author?.bio ?? undefined,
    image: author?.avatar_url ?? undefined,
    sameAs: author?.same_as?.length ? author.same_as : site.organization.sameAs,
    worksFor: { '@id': ORG_ID },
    knowsAbout: [
      'Sports psychology',
      'Wushu',
      'Kung Fu',
      'Martial arts coaching',
      'Competition mindset',
      'Mental toughness training',
    ],
    hasCredential: credentials.map((c) => ({
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: c,
      name: c,
    })),
    homeLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Chennai',
        addressRegion: 'Tamil Nadu',
        addressCountry: 'IN',
      },
    },
  });
}

export function blogPostingSchema(post: FullPost): Json {
  const url = absoluteUrl(`/${post.slug}`);
  const images = [
    post.featured_image_url,
    ...post.images.filter((i) => i.role === 'body').map((i) => i.url),
  ].filter(Boolean) as string[];
  const wordCount = stripMarkdown(post.body_md).split(/\s+/).filter(Boolean).length;

  return clean({
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: post.seo_title || post.title,
    name: post.title,
    description: post.excerpt,
    // The direct-answer paragraph, offered explicitly as the abstract so answer
    // engines have a clean, quotable summary of the page.
    abstract: post.answer_summary,
    articleBody: stripMarkdown(post.body_md).slice(0, 5000),
    wordCount,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: post.published_at ?? post.created_at,
    dateModified: post.updated_at,
    inLanguage: site.language,
    image: images.length ? images : [absoluteUrl(site.defaultOgImage)],
    keywords: post.seo_keywords?.length ? post.seo_keywords.join(', ') : undefined,
    articleSection: post.category?.name,
    author: { '@id': PERSON_ID },
    publisher: { '@id': ORG_ID },
    isPartOf: { '@id': SITE_ID },
  });
}

export function faqPageSchema(faqs: PostFaq[]): Json | null {
  if (!faqs.length) return null;
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]): Json {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function collectionPageSchema(category: Category, posts: Post[]): Json {
  const url = absoluteUrl(`/category/${category.slug}`);
  return clean({
    '@type': 'CollectionPage',
    '@id': `${url}#collection`,
    name: category.name,
    description: category.description ?? undefined,
    url,
    inLanguage: site.language,
    isPartOf: { '@id': SITE_ID },
    about: category.name,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: posts.length,
      itemListElement: posts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absoluteUrl(`/${post.slug}`),
        name: post.title,
      })),
    },
  });
}

export function profilePageSchema(author: Author | null): Json {
  return {
    '@type': 'ProfilePage',
    '@id': `${absoluteUrl(site.authorPagePath)}#profile`,
    url: absoluteUrl(site.authorPagePath),
    name: `${author?.name ?? 'Kishore Kumar'} — ${author?.job_title ?? 'Sports Psychologist & Martial Arts Coach'}`,
    inLanguage: site.language,
    mainEntity: { '@id': PERSON_ID },
    isPartOf: { '@id': SITE_ID },
  };
}

/** Wrap any number of nodes in a single @graph document. */
export function graph(...nodes: (Json | null | undefined)[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': nodes.filter(Boolean),
  });
}
