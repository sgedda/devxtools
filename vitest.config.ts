/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// getViteConfig() adds Astro's Vite plugins so tests can render .astro components
// with the Container API (see tests/step-clip.test.ts).
export default getViteConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      '**/*.spec.ts', // Exclude Playwright test files
      '**/demos/**', // Exclude demo projects (tested separately in CI)
    ],
  },
});
