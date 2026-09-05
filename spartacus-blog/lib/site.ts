/** Single source of truth for everything that appears in metadata and JSON-LD. */
export const site = {
  name: 'Spartacus Martial Arts Academy',
  blogName: 'Spartacus Blog',
  tagline: 'Train Smart. Fight Fearless.',
  description:
    'Sports psychology and martial arts, written by Kishore Kumar — Wushu national medalist, sports psychologist and coach in Chennai.',
  // Runtime-read, for the same reason as the Supabase URL: a NEXT_PUBLIC_ name
  // would be frozen into the bundle at build time.
  url: (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://blog.spartacusmartialarts.com').replace(/\/$/, ''),
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

export function absoluteUrl(path = '/'): string {
  return `${site.url}${path.startsWith('/') ? path : `/${path}`}`;
}
