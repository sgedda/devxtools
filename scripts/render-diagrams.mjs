// scripts/render-diagrams.mjs — `npm run diagrams` (local or GitHub Actions, NOT on CF Pages).
// Renders each src/diagrams/<name>.mmd twice with the site theme and writes
// public/diagrams/<name>-{light,dark}.svg (root width/height stripped so they scale). Commit the output.
// Articles embed them as raw HTML <figure class="dx-diagram"> blocks.
// Deps (dev): mermaid, playwright (already present), @fontsource-variable/inter (for exact text metrics).
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const theme = JSON.parse(readFileSync('src/diagrams/mermaid-theme.json', 'utf8'));
const OUT = 'public/diagrams'; mkdirSync(OUT, { recursive: true });
const sources = readdirSync('src/diagrams').filter((f) => f.endsWith('.mmd'))
  .map((f) => [f.replace(/\.mmd$/, ''), readFileSync(`src/diagrams/${f}`, 'utf8')]);

const font = require.resolve('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2');
const browser = await chromium.launch(); const page = await browser.newPage();
await page.setContent(`<style>@font-face{font-family:Inter;font-weight:100 900;src:url(data:font/woff2;base64,${readFileSync(font).toString('base64')})}</style><span style="font-family:Inter">x</span>`);
await page.addScriptTag({ path: require.resolve('mermaid/dist/mermaid.min.js') });
await page.evaluate(() => document.fonts.ready);

for (const [name, src] of sources) {
  for (const mode of ['light', 'dark']) {
    const conf = { ...theme.common, themeVariables: theme[mode].themeVariables, startOnLoad: false };
    const code = src.trimStart().startsWith('flowchart') ? `${src}\n  ${theme[mode].accentClassDef}` : src;
    const svg = await page.evaluate(async ([c, s, id]) => { mermaid.initialize(c); return (await mermaid.render(id, s)).svg; },
      [conf, code, `mmd-${name}-${mode}`]);
    const root = svg.match(/^<svg[^>]*>/)[0];
    const clean = root.replace(/\s(width|height)="[^"]*"/g, '').replace(/max-width:[^;"]*;?/g, '');
    writeFileSync(`${OUT}/${name}-${mode}.svg`, svg.replace(root, clean));
  }
  console.log('rendered', name);
}
await browser.close();
