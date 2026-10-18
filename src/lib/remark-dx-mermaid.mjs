// remark-dx-mermaid.mjs — preserves mermaid meta by prepending it as a comment
import { visit } from 'unist-util-visit';

export default function remarkDxMermaid() {
  return (tree) => {
    visit(tree, 'code', (node) => {
      if (node.lang !== 'mermaid') return;
      
      // Prepend the meta as a comment in the mermaid code so it survives to rehype
      // The hash will be computed from the original source (without the comment) in rehype
      if (node.meta) {
        node.value = `%% DXMETA: ${node.meta}\n${node.value}`;
      }
    });
  };
}
