// remark-dx-mermaid.mjs
import { visit } from 'unist-util-visit';

export default function remarkDxMermaid() {
  return function transformer(tree) {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'mermaid') return;
      if (index == null || !parent) return;
      
      // Replace with simple test HTML
      parent.children[index] = {
        type: 'html',
        value: '<div class="TEST-MERMAID">Mermaid diagram here</div>',
      };
    });
  };
}
