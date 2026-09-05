/**
 * Hostinger runs this as a long-lived Node process (`next start`), so we keep
 * the default server output — ISR, on-demand revalidation and next/image
 * optimisation all need it.
 */
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname;
  } catch {
    return null;
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The deploy workflow sets NEXT_OUTPUT_STANDALONE=1 so the build produces a
  // self-contained .next/standalone bundle (server + pruned node_modules) that
  // can be copied to Hostinger without running npm install on the host.
  output: process.env.NEXT_OUTPUT_STANDALONE === '1' ? 'standalone' : undefined,
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
      { protocol: 'https', hostname: '**.higgsfield.ai' },
      { protocol: 'https', hostname: '**.hf-cdn.com' },
      ...(supabaseHost ? [{ protocol: 'https', hostname: supabaseHost }] : []),
    ],
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
