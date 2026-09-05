/**
 * Where the blog is mounted.
 *
 *   origin   — scheme + host, e.g. https://spartacusmartialarts.com
 *   basePath — '' when the blog owns a domain of its own (a subdomain),
 *              '/blog' when it is mounted as a subfolder of the main site.
 *
 * Keep these separate: Next needs the bare basePath in next.config.mjs, while
 * canonical URLs, JSON-LD @ids and the sitemap need the two joined.
 */
const origin = (
  process.env.SITE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  'https://blog.spartacusmartialarts.com'
).replace(/\/+$/, '');

/** '' or a leading-slash path with no trailing slash. */
export const basePath = (process.env.BASE_PATH ?? '')
  .trim()
  .replace(/\/+$/, '')
  .replace(/^(?!\/)(.+)$/, '/$1');

/** Single source of truth for everything that appears in metadata and JSON-LD. */
export const site = {
  name: 'Spartacus Martial Arts Academy',
  blogName: 'Spartacus Blog',
  tagline: 'Train Smart. Fight Fearless.',
  description:
    'Sports psychology and martial arts, written by Kishore Kumar — Wushu national medalist, sports psychologist and coach in Chennai.',
  origin,
  basePath,
  /** The blog's canonical root: origin + basePath, never with a trailing slash. */
  url: `${origin}${basePath}`,
  mainSiteUrl: 'https://spartacusmartialarts.com',
  locale: 'en_IN',
  language: 'en-IN',
  logo: '/logo.png',
  defaultOgImage: '/og-default.jpg',
  twitter: '@kishorekumarcoach',
  authorSlug: 'kishore-kumar',
  authorPagePath: '/about-kishore',
  organization: {
    name: 'Spartacus Martial Arts Academy',
    url: 'https://spartacusmartialarts.com',
    areaServed: 'Chennai, Tamil Nadu, India',
    sameAs: ['https://www.instagram.com/kishorekumar.coach/'],
  },
} as const;

/**
 * Loud warning for the one misconfiguration that fails silently.
 *
 * Statically prerendered routes (robots.txt, sitemap.xml, llms.txt, the
 * homepage) bake this origin in at BUILD time, so if the build environment is
 * missing SITE_URL every canonical URL, JSON-LD @id and sitemap entry points at
 * the default domain and nothing visibly breaks. Say so in the build log.
 */
if (
  process.env.NODE_ENV === 'production' &&
  !process.env.SITE_URL &&
  !process.env.NEXT_PUBLIC_SITE_URL
) {
  console.warn(
    '[site] SITE_URL is not set — falling back to https://blog.spartacusmartialarts.com. ' +
      'Set it in the BUILD environment, not just at runtime: prerendered routes freeze it in.',
  );
}

/**
 * Absolute URL for a site-relative path, basePath included.
 * `absoluteUrl('/')` returns the canonical root with no trailing slash, so the
 * homepage has exactly one canonical form.
 */
export function absoluteUrl(path = '/'): string {
  const suffix = path === '/' || path === '' ? '' : path.startsWith('/') ? path : `/${path}`;
  return `${site.url}${suffix}`;
}
