// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import rehypeDxTables from './src/lib/rehype-dx-tables.mjs';
import rehypeDxMermaid from './src/lib/rehype-dx-mermaid.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://devxtools.dev',
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      excludeLangs: ['mermaid'],
    },
    rehypePlugins: [rehypeDxMermaid, rehypeDxTables],
  },
  integrations: [
    mdx(),
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
