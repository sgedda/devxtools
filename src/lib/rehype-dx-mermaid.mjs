// rehype-dx-mermaid.mjs — post-process mermaid code blocks in HTML
import { visit } from 'unist-util-visit';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DIR = resolve('src/diagrams/rendered');
const diagramHash = (src) => createHash('sha1').update(src.trim()).digest('hex').slice(0, 12);

export default function rehypeDxMermaid() {
  let figureCount = 0;
  
  return (tree, file) => {
    visit(tree, 'element', (node, index, parent) => {
      // Find pre > code.language-mermaid
      if (node.tagName !== 'pre' || !node.children || node.children.length === 0) return;
      
      const codeNode = node.children[0];
      if (!codeNode || codeNode.tagName !== 'code') return;
      
      const classes = codeNode.properties?.className || [];
      if (!classes.includes('language-mermaid')) return;
      
      // Extract mermaid source from text content
      const textNode = codeNode.children?.find(n => n.type === 'text');
      if (!textNode || !textNode.value) return;
      
      const src = textNode.value;
      const hash = diagramHash(src);
      
      // For now, just replace with a marker to test
      figureCount++;
      
      const replacement = {
        type: 'element',
        tagName: 'div',
        properties: { className: [`REHYPE-MERMAID-${figureCount}`] },
        children: [{ type: 'text', value: `Diagram ${figureCount}` }],
      };
      
      if (parent && index != null) {
        parent.children[index] = replacement;
      }
    });
  };
}
