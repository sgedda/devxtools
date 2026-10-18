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
// rehype-dx-mermaid.mjs — swaps mermaid code blocks for pre-rendered SVGs
import { visit } from 'unist-util-visit';
import { fromHtml } from 'hast-util-from-html';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DIR = resolve('src/diagrams/rendered');
export const diagramHash = (src) => createHash('sha1').update(src.trim()).digest('hex').slice(0, 12);
const text = (n) => n.type === 'text' ? n.value : (n.children || []).map(text).join('');

export default function rehypeDxMermaid() {
  return (tree, file) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'pre' || !parent || index == null) return;
      
      // Check if this pre has data-language="mermaid"
      const dataLang = node.properties?.dataLanguage || node.properties?.['data-language'];
      if (dataLang !== 'mermaid') return;

      const code = node.children.find((c) => c.tagName === 'code');
      if (!code) return;

      const src = text(code);
      
      // Get the meta that was preserved by the remark plugin
      // Check code.data.meta first (from remark), then fallback to checking properties
      const meta = code.data?.meta || node.properties?.dataMermaidMeta || node.properties?.['data-mermaid-meta'] || 
                   code.properties?.dataMermaidMeta || code.properties?.['data-mermaid-meta'] || '';
      const altMatch = meta.match(/alt="([^"]*)"/);
      const captionMatch = meta.match(/caption="([^"]*)"/);
      
      const hash = diagramHash(src);
      
      // Try to find the diagram files
      const svgs = ['light', 'dark'].map((mode) => {
        const p = `${DIR}/${hash}-${mode}.svg`;
        if (!existsSync(p)) {
          console.warn(`[rehype-dx-mermaid] Diagram ${hash} not found. Run: npm run diagrams`);
          return null;
        }
        const root = fromHtml(readFileSync(p, 'utf8'), { fragment: true, space: 'svg' });
        const svg = root.children.find((c) => c.tagName === 'svg');
        if (!svg) return null;
        
        const w = Math.round(Number(String(svg.properties.viewBox).split(/\s+/)[2]));
        delete svg.properties.width; delete svg.properties.height; delete svg.properties.style;
        for (const k of Object.keys(svg.properties)) if (/roledescription/i.test(k)) delete svg.properties[k];
        Object.assign(svg.properties, {
          className: [`mmd-${mode}`], style: `--w:${w}px`, role: 'img',
          ariaLabel: altMatch ? altMatch[1] : 'Diagram',
          focusable: 'false', dataNarrow: w <= 420 ? '' : undefined,
        });
        return svg;
      }).filter(Boolean);

      if (svgs.length === 0) return;

      const figure = {
        type: 'element', tagName: 'figure', properties: { className: ['dx-diagram'] },
        children: [
          { type: 'element', tagName: 'div',
            properties: { className: ['dx-figure__frame'], role: 'group', tabIndex: 0, ariaLabel: 'Diagram, scrolls horizontally' },
            children: svgs },
          ...(captionMatch ? [{ type: 'element', tagName: 'figcaption', properties: {}, children: [{ type: 'text', value: captionMatch[1] }] }] : []),
        ],
      };
      parent.children.splice(index, 1, figure);
    });
  };
}
