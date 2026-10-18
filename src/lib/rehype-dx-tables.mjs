// rehype-dx-tables.mjs — wraps every markdown table at build time.
// astro.config.mjs:  markdown: { rehypePlugins: [rehypeDxTables] }   (MDX inherits it)
// Output:
// <div class="dx-table" style="--cols:5">
//   <div class="dx-table__scroll" role="region" tabindex="0" aria-label="Table: TL;DR">
//     <table>… thead th[scope=col] … tbody first cell → th[scope=row] …</table>
//   </div>
// </div>
// <p class="dx-table__hint" aria-hidden="true">Swipe the table to see all 5 columns →</p>
import { visit, SKIP } from 'unist-util-visit';

const text = (n) => n.type === 'text' ? n.value : (n.children || []).map(text).join('');
const el = (tagName, properties, children) => ({ type: 'element', tagName, properties, children });

export default function rehypeDxTables() {
  return (tree) => {
    let lastHeading = '';
    let count = 0;
    visit(tree, 'element', (node, index, parent) => {
      if (/^h[2-4]$/.test(node.tagName)) { lastHeading = text(node).trim(); return; }
      if (node.tagName !== 'table' || !parent || index == null) return;
      if (parent.properties?.className?.includes?.('dx-table__scroll')) return;
      count++;

      const thead = node.children.find((c) => c.tagName === 'thead');
      const tbody = node.children.find((c) => c.tagName === 'tbody');
      const headRow = thead?.children.find((c) => c.tagName === 'tr');
      const cols = headRow ? headRow.children.filter((c) => c.type === 'element').length : 3;
      headRow?.children.forEach((c) => { if (c.tagName === 'th') c.properties = { ...c.properties, scope: 'col' }; });
      tbody?.children.forEach((tr) => {
        const first = tr.children?.find((c) => c.type === 'element');
        if (first?.tagName === 'td') { first.tagName = 'th'; first.properties = { ...first.properties, scope: 'row' }; }
      });

      const label = `Table: ${lastHeading || `table ${count}`}`;
      const scroll = el('div', { className: ['dx-table__scroll'], role: 'region', tabIndex: 0, ariaLabel: label }, [node]);
      const box = el('div', { className: ['dx-table'], style: `--cols:${cols}` }, [scroll]);
      const hint = el('p', { className: ['dx-table__hint'], ariaHidden: 'true' }, [
        { type: 'text', value: `Swipe the table to see all ${cols} columns →` },
      ]);
      parent.children.splice(index, 1, box, hint);
      return [SKIP, index + 2];
    });
  };
}
