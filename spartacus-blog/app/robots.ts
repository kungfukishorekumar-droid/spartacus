import type { MetadataRoute } from 'next';
import { absoluteUrl, site } from '@/lib/site';

/**
 * Explicitly ALLOW the AI answer engines.
 *
 * Most sites block these by accident (or by a host's default) and then wonder
 * why they never appear in ChatGPT, Gemini or Perplexity answers. Naming each
 * one with an empty Disallow is the unambiguous opt-in.
 */
const AI_AND_SEARCH_CRAWLERS = [
  'Googlebot',
  'Googlebot-Image',
  'Google-Extended', // Gemini / Google AI training + grounding
  'Bingbot',
  'GPTBot', // ChatGPT training
  'OAI-SearchBot', // ChatGPT search
  'ChatGPT-User', // ChatGPT live browsing
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'CCBot', // Common Crawl — feeds many models
  'Applebot',
  'Applebot-Extended',
  'Amazonbot',
  'Bytespider',
  'DuckDuckBot',
  'YandexBot',
  'facebookexternalhit',
  'Twitterbot',
  'LinkedInBot',
  'Slackbot',
  'WhatsApp',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...AI_AND_SEARCH_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: '/admin',
      })),
      { userAgent: '*', allow: '/', disallow: '/admin' },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: site.url,
  };
}
