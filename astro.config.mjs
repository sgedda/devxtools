// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

// https://astro.build/config
export default defineConfig({
  site: 'https://devxtools.dev',
  integrations: [sitemap()],
  trailingSlash: 'always',
  build: {
    format: 'directory'
  },
  vite: {
    css: {
      postcss: {
        plugins: [
          tailwindcss,
          autoprefixer,
        ],
      },
    },
  },
});
