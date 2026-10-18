// rehype-dx-mermaid.mjs — swaps ```mermaid fences for pre-rendered light + dark SVGs.
// No mermaid JS ships to the browser. SVGs are rendered by `npm run diagrams`
// (scripts/render-diagrams.mjs, Playwright + mermaid, run locally/CI) and committed to
// src/diagrams/rendered/, because Cloudflare Pages builds skip the Playwright install.
//
// astro.config.mjs:
//   markdown: {
//     syntaxHighlight: { type: 'shiki', excludeLangs: ['mermaid'] },
//     rehypePlugins: [rehypeDxMermaid, rehypeDxTables],
//   }
// Authoring (.md):
//   ```mermaid caption="Figure 1. Pick the mock by where the code runs." alt="Flowchart. …"
//   flowchart TD
//     …
//   ```
import { visit } from 'unist-util-visit';
import { fromHtml } from 'hast-util-from-html';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DIR = resolve('src/diagrams/rendered');
export const diagramHash = (src) => createHash('sha1').update(src.trim()).digest('hex').slice(0, 12);
const text = (n) => n.type === 'text' ? n.value : (n.children || []).map(text).join('');
const meta = (s = '', key) => (s.match(new RegExp(`${key}="([^"]*)"`)) || [])[1];

export default function rehypeDxMermaid() {
  return (tree, file) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'pre' || !parent) return;
      const code = node.children.find((c) => c.tagName === 'code');
      const cls = code?.properties?.className || [];
      if (!cls.includes('language-mermaid')) return;

      const src = text(code);
      const m = code.data?.meta || '';
      const alt = meta(m, 'alt');
      const caption = meta(m, 'caption');
      if (!alt) file.fail(`mermaid diagram without alt="…" in ${file.path}`, node);

      const hash = diagramHash(src);
      const svgs = ['light', 'dark'].map((mode) => {
        const p = `${DIR}/${hash}-${mode}.svg`;
        if (!existsSync(p)) file.fail(`Diagram ${hash} not rendered. Run: npm run diagrams`, node);
        const root = fromHtml(readFileSync(p, 'utf8'), { fragment: true, space: 'svg' });
        const svg = root.children.find((c) => c.tagName === 'svg');
        const w = Math.round(Number(String(svg.properties.viewBox).split(/\s+/)[2]));
        delete svg.properties.width; delete svg.properties.height; delete svg.properties.style;
        for (const k of Object.keys(svg.properties)) if (/roledescription/i.test(k)) delete svg.properties[k];
        Object.assign(svg.properties, {
          className: [`mmd-${mode}`], style: `--w:${w}px`, role: 'img', ariaLabel: alt,
          focusable: 'false', dataNarrow: w <= 420 ? '' : undefined,
        });
        return svg;
      });

      const figure = {
        type: 'element', tagName: 'figure', properties: { className: ['dx-diagram'] },
        children: [
          { type: 'element', tagName: 'div',
            properties: { className: ['dx-figure__frame'], role: 'group', tabIndex: 0, ariaLabel: 'Diagram, scrolls horizontally' },
            children: svgs },
          ...(caption ? [{ type: 'element', tagName: 'figcaption', properties: {}, children: [{ type: 'text', value: caption }] }] : []),
        ],
      };
      parent.children.splice(index, 1, figure);
    });
  };
}
