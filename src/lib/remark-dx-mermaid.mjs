// remark-dx-mermaid.mjs — preserves mermaid meta for later rehype processing
import { visit } from 'unist-util-visit';

export default function remarkDxMermaid() {
  return (tree) => {
    visit(tree, 'code', (node) => {
      if (node.lang !== 'mermaid') return;
      
      // Store the meta in node.data.hProperties so it survives to rehype
      if (node.meta) {
        node.data = node.data || {};
        node.data.hProperties = node.data.hProperties || {};
        node.data.hProperties.dataMermaidMeta = node.meta;
      }
    });
  };
}
