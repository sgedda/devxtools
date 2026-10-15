import { visit } from 'unist-util-visit';
import { h } from 'hastscript';

/**
 * Rehype plugin to wrap tables in a scrollable container with proper accessibility
 */
export function rehypeTableWrapper() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName === 'table' && parent && index !== null) {
        // Find the preceding heading to use as caption text
        let captionText = '';
        for (let i = index - 1; i >= 0; i--) {
          const sibling = parent.children[i];
          if (sibling.type === 'element' && /^h[1-6]$/.test(sibling.tagName)) {
            // Extract text content from heading
            const textNodes = [];
            visit(sibling, 'text', (textNode) => {
              textNodes.push(textNode.value);
            });
            captionText = textNodes.join(' ');
            break;
          }
        }

        // Add caption if we found heading text
        if (captionText && !node.children.some(child => child.type === 'element' && child.tagName === 'caption')) {
          node.children.unshift(
            h('caption', { className: ['sr-only'] }, captionText)
          );
        }

        // Make first column cells use th with scope="row"
        const rows = [];
        visit(node, 'element', (elem) => {
          if (elem.tagName === 'tr') {
            rows.push(elem);
          }
        });

        for (const row of rows) {
          if (row.children && row.children.length > 0) {
            const firstCell = row.children.find(child => 
              child.type === 'element' && (child.tagName === 'td' || child.tagName === 'th')
            );
            if (firstCell && firstCell.tagName === 'td') {
              // Check if this is in tbody (not thead)
              let inTbody = false;
              visit(node, 'element', (elem) => {
                if (elem.tagName === 'tbody' && elem.children.includes(row)) {
                  inTbody = true;
                }
              });
              
              if (inTbody) {
                firstCell.tagName = 'th';
                firstCell.properties = { ...firstCell.properties, scope: 'row' };
              }
            }
          }
        }

        // Wrap table in overflow container
        const wrapper = h('div', { className: ['table-wrapper'] }, [node]);
        parent.children[index] = wrapper;
      }
    });
  };
}
