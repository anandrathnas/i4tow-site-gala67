// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// `SITE_URL` is injected by the deploy workflow (the site's custom apex domain
// or the GitHub Pages URL). `base` is '/' for a custom/apex domain — never
// '/repo-name', which would break links. Sitemap needs `site` set.
const site = process.env.SITE_URL ?? 'https://example.com';

export default defineConfig({
  site,
  base: '/',
  trailingSlash: 'always', // preserve existing /curriculum/ style URLs (SEO)
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
