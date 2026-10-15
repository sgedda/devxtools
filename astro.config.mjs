// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://devxtools.dev',
  integrations: [
    sitemap({
      filter: (page) => {
        // Exclude newsletter pages
        if (page.includes('/newsletter/')) return false;
        // Exclude test pages
        if (page.includes('/test-code-highlighting/')) return false;
        // Exclude stub guide pages
        if (page.includes('/guides/msw-vs-nock-vs-polly/')) return false;
        return true;
      }
    })
  ],
  trailingSlash: 'always',
  build: {
    format: 'directory'
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
