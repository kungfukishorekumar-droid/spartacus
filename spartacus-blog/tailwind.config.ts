import type { Config } from 'tailwindcss';

/**
 * Spartacus brand: black · blood red · gold · bone white.
 * Warrior aesthetic — high contrast, heavy display type, no soft corporate blues.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0b',
        char: '#141417',
        steel: '#26262c',
        blood: '#c1121f',
        bloodDark: '#8d0b16',
        gold: '#d4a437',
        goldDark: '#a37c22',
        bone: '#f4f1ea',
        ash: '#a5a3a0',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Impact', 'ui-sans-serif', 'sans-serif'],
        body: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        prose: '72ch',
      },
      typography: () => ({
        spartacus: {
          css: {
            '--tw-prose-body': '#e7e4dd',
            '--tw-prose-headings': '#f4f1ea',
            '--tw-prose-lead': '#c9c6bf',
            '--tw-prose-links': '#d4a437',
            '--tw-prose-bold': '#f4f1ea',
            '--tw-prose-counters': '#d4a437',
            '--tw-prose-bullets': '#c1121f',
            '--tw-prose-hr': '#26262c',
            '--tw-prose-quotes': '#f4f1ea',
            '--tw-prose-quote-borders': '#c1121f',
            '--tw-prose-captions': '#a5a3a0',
            '--tw-prose-code': '#f4f1ea',
            '--tw-prose-pre-bg': '#141417',
            '--tw-prose-th-borders': '#26262c',
            '--tw-prose-td-borders': '#26262c',
          },
        },
      }),
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
