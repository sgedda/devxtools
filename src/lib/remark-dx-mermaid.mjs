// remark-dx-mermaid.mjs — TEST
import { visit } from 'unist-util-visit';

export default function remarkDxMermaid() {
  return (tree, file) => {
    let count = 0;
    
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'mermaid' || index == null || !parent) return;
      
      count++;
      parent.children[index] = {
        type: 'html',
        value: `<div class="MERMAID-${count}">DIAGRAM ${count}</div>`,
      };
    });
  };
}
