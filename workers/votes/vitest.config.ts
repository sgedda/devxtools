import { defineConfig } from 'vitest/config';
import { cloudflarePool } from '@cloudflare/vitest-plugin';

export default defineConfig({
  test: {
    pool: cloudflarePool({
      wrangler: {
        configPath: './wrangler.toml',
      },
    }),
  },
});
