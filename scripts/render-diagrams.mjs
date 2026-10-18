// scripts/render-diagrams.mjs — `npm run diagrams` (local or GitHub Actions, NOT on CF Pages).
// Finds ```mermaid fences in src/content/articles/*.md(x), renders each twice with the site theme,
// writes src/diagrams/rendered/<hash>-{light,dark}.svg. Commit the output.
// Deps (dev): mermaid, playwright (already present), @fontsource-variable/inter (for exact text metrics).
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { diagramHash } from '../src/lib/rehype-dx-mermaid.mjs';

const require = createRequire(import.meta.url);
const theme = JSON.parse(readFileSync('src/diagrams/mermaid-theme.json', 'utf8'));
const OUT = 'src/diagrams/rendered'; mkdirSync(OUT, { recursive: true });
const fence = /```mermaid[^\n]*\n([\s\S]*?)```/g;

const sources = readdirSync('src/content/articles').filter((f) => /\.mdx?$/.test(f))
  .flatMap((f) => [...readFileSync(`src/content/articles/${f}`, 'utf8').matchAll(fence)].map((m) => m[1]));

const font = require.resolve('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2');
const browser = await chromium.launch(); const page = await browser.newPage();
await page.setContent(`<style>@font-face{font-family:Inter;font-weight:100 900;src:url(data:font/woff2;base64,${readFileSync(font).toString('base64')})}</style><span style="font-family:Inter">x</span>`);
await page.addScriptTag({ path: require.resolve('mermaid/dist/mermaid.min.js') });
await page.evaluate(() => document.fonts.ready);

for (const src of sources) {
  const hash = diagramHash(src);
  for (const mode of ['light', 'dark']) {
    const conf = { ...theme.common, themeVariables: theme[mode].themeVariables, startOnLoad: false };
    const code = src.trimStart().startsWith('flowchart') ? `${src}\n  ${theme[mode].accentClassDef}` : src;
    const svg = await page.evaluate(async ([c, s, id]) => { mermaid.initialize(c); return (await mermaid.render(id, s)).svg; },
      [conf, code, `mmd-${hash}-${mode}`]);
    writeFileSync(`${OUT}/${hash}-${mode}.svg`, svg);
  }
  console.log('rendered', hash);
}
await browser.close();
