import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Live on GitHub Pages under /Propbillions until propbillions.com points here.
// For the real domain: SITE_URL=https://propbillions.com BASE_PATH=/ npm run build
const site = process.env.SITE_URL || 'https://psychologymatters561-design.github.io';
const base = process.env.BASE_PATH ?? '/Propbillions';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  integrations: [sitemap()],
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  vite: { build: { assetsInlineLimit: 2048 } },
});
