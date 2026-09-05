/**
 * Hostinger runs this as a long-lived Node process (`next start`), so we keep
 * the default server output — ISR, on-demand revalidation and next/image
 * optimisation all need it.
 */
// Mount point. Empty for a subdomain; '/blog' to serve as a subfolder of the
// main site. Must match BASE_PATH in lib/site.ts — both read the same variable.
const basePath = (process.env.BASE_PATH ?? '')
  .trim()
  .replace(/\/+$/, '')
  .replace(/^(?!\/)(.+)$/, '/$1');

/**
 * Hosts next/image is allowed to optimise from.
 *
 * The blog's images live on the main academy site (the existing
 * images/blog100/ library and anything added later) and, optionally, Supabase
 * Storage. Add more with IMAGE_HOSTS, comma-separated — it is read at BUILD
 * time, so set it in the build environment, not only at runtime.
 */
function imageHosts() {
  const hosts = new Set([
    'spartacusmartialarts.com',
    '*.spartacusmartialarts.com',
    '**.supabase.co',
    '**.supabase.in',
  ]);

  for (const raw of (process.env.IMAGE_HOSTS ?? '').split(',')) {
    const host = raw.trim();
    if (host) hosts.add(host);
  }

  // If Supabase is on a custom domain, allow that host too.
  try {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (url) hosts.add(new URL(url).hostname);
  } catch {
    // Malformed SUPABASE_URL — the wildcards above still cover hosted projects.
  }

  return [...hosts].map((hostname) => ({ protocol: 'https', hostname }));
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(basePath ? { basePath } : {}),
  // The deploy workflow sets NEXT_OUTPUT_STANDALONE=1 so the build produces a
  // self-contained .next/standalone bundle (server + pruned node_modules) that
  // can be copied to Hostinger without running npm install on the host.
  output: process.env.NEXT_OUTPUT_STANDALONE === '1' ? 'standalone' : undefined,
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: imageHosts(),
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
