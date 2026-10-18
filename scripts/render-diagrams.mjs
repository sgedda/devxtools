// scripts/render-diagrams.mjs — `npm run diagrams` (local only, NOT on CF Pages).
// Renders each src/diagrams/<name>.mmd twice with the site theme (mermaid loaded from the
// jsDelivr CDN, so it is not a project dependency) and:
//   1. writes public/diagrams/<name>-{light,dark}.svg (full-size, the tap-to-open target);
//   2. inlines both SVGs into every article figure marked data-diagram="<name>", so labels use
//      the page's Inter font and the light/dark swap follows the site theme (.dark).
// The first line of each .mmd is `%% alt: <text alternative>`; it becomes the SVG aria-label.
// Commit the output.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@12.2.0/dist/mermaid.min.js';
const require = createRequire(import.meta.url);
const theme = JSON.parse(readFileSync('src/diagrams/mermaid-theme.json', 'utf8'));
const OUT = 'public/diagrams'; mkdirSync(OUT, { recursive: true });
const ARTICLES = 'src/content/articles';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const sources = readdirSync('src/diagrams').filter((f) => f.endsWith('.mmd')).map((f) => {
  const raw = readFileSync(`src/diagrams/${f}`, 'utf8');
  const alt = (raw.match(/^%% alt: (.*)$/m) || [, ''])[1].trim();
  return { name: f.replace(/\.mmd$/, ''), alt, src: raw.replace(/^%%.*\n/gm, '') };
});

const font = require.resolve('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2');
const browser = await chromium.launch(); const page = await browser.newPage();
await page.setContent(`<style>@font-face{font-family:Inter;font-weight:100 900;src:url(data:font/woff2;base64,${readFileSync(font).toString('base64')})}</style><span style="font-family:Inter">x</span>`);
await page.addScriptTag({ url: MERMAID });
await page.evaluate(() => document.fonts.ready);

const inline = {};
for (const { name, alt, src } of sources) {
  const parts = [];
  for (const mode of ['light', 'dark']) {
    const conf = { ...theme.common, themeVariables: theme[mode].themeVariables, startOnLoad: false };
    const code = src.trimStart().startsWith('flowchart') ? `${src}\n  ${theme[mode].accentClassDef}` : src;
    let svg = await page.evaluate(async ([c, s, id]) => { mermaid.initialize(c); return (await mermaid.render(id, s)).svg; },
      [conf, code, `mmd-${name}-${mode}`]);
    svg = svg.replace(/<br\s*>/g, '<br/>').replace(/\r?\n/g, ' ');           // well-formed XML, one line
    const root = svg.match(/^<svg[^>]*>/)[0];
    const w = Math.round(Number(root.match(/viewBox="[^"]*?\s([\d.]+)\s[\d.]+"/)[1]));
    const bare = root.replace(/\s(width|height|style)="[^"]*"/g, '');
    writeFileSync(`${OUT}/${name}-${mode}.svg`, svg.replace(root, bare.replace('<svg', `<svg width="${w}"`)));
    const inl = bare.replace('<svg', `<svg class="mmd-${mode}" width="100%" style="max-width:${w}px" role="img" aria-label="${esc(alt)}"`)
      .replace(/\s(role|aria-roledescription)="graphics-document document"/, '');
    parts.push(svg.replace(root, inl));
  }
  inline[name] = parts;
  console.log('rendered', name);
}
await browser.close();

for (const f of readdirSync(ARTICLES).filter((f) => /\.mdx?$/.test(f))) {
  const md = readFileSync(`${ARTICLES}/${f}`, 'utf8');
  const out = md.replace(/(<figure class="dx-diagram" data-diagram="([\w-]+)">\n  <a class="dx-figure__frame"[^\n]*>\n)([\s\S]*?)(\n  <\/a>)/g,
    (all, head, name, _body, tail) => (inline[name] ? head + inline[name].join('\n') + tail : all));
  if (out !== md) { writeFileSync(`${ARTICLES}/${f}`, out); console.log('inlined into', f); }
}
