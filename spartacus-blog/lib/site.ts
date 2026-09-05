/** Single source of truth for everything that appears in metadata and JSON-LD. */
export const site = {
  name: 'Spartacus Martial Arts Academy',
  blogName: 'Spartacus Blog',
  tagline: 'Train Smart. Fight Fearless.',
  description:
    'Sports psychology and martial arts, written by Kishore Kumar — Wushu national medalist, sports psychologist and coach in Chennai.',
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://blog.spartacusmartialarts.com').replace(/\/$/, ''),
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

export function absoluteUrl(path = '/'): string {
  return `${site.url}${path.startsWith('/') ? path : `/${path}`}`;
}
