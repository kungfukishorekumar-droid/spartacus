import type { Metadata, Viewport } from 'next';
import { Inter, Oswald } from 'next/font/google';
import JsonLd from '@/components/JsonLd';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { getCategories } from '@/lib/queries';
import { graph, organizationSchema, websiteSchema } from '@/lib/schema';
import { site } from '@/lib/site';
import './globals.css';

// next/font self-hosts these and emits font-display: swap, so there is no
// render-blocking request to fonts.googleapis.com at runtime.
const display = Oswald({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.blogName} — Sports Psychology & Martial Arts, Chennai`,
    template: `%s | ${site.blogName}`,
  },
  description: site.description,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: site.blogName,
    locale: site.locale,
    url: site.url,
    title: `${site.blogName} — Sports Psychology & Martial Arts, Chennai`,
    description: site.description,
  },
  twitter: { card: 'summary_large_image', site: site.twitter, creator: site.twitter },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0b',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategories();

  return (
    <html lang={site.language} className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-screen flex-col bg-ink font-body text-bone antialiased">
        <JsonLd json={graph(organizationSchema(), websiteSchema())} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-gold focus:px-4 focus:py-2 focus:font-display focus:text-ink"
        >
          Skip to content
        </a>
        <SiteHeader categories={categories} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter categories={categories} />
      </body>
    </html>
  );
}
