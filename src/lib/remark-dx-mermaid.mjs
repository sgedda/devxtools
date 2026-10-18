// remark-dx-mermaid.mjs — preserves mermaid meta for later rehype processing
import { visit } from 'unist-util-visit';

export default function remarkDxMermaid() {
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'mermaid') return;
      
      // Store the meta in node.data so it can be accessed later
      // Set it on both the code node and prepare for the parent pre element
      if (node.meta) {
        node.data = node.data || {};
        node.data.hProperties = node.data.hProperties || {};
        node.data.hProperties.dataMermaidMeta = node.meta;
        
        // Also set on parent if available
        if (parent) {
          parent.data = parent.data || {};
          parent.data.hProperties = parent.data.hProperties || {};
          parent.data.hProperties.dataMermaidMeta = node.meta;
        }
      }
    });
  };
}
