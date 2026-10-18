#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { createHash } from 'crypto';

const DIST = resolve('dist');
const SVG_DIR = resolve('src/diagrams/rendered');

const diagramHash = (src) => createHash('sha1').update(src.trim()).digest('hex').slice(0, 12);

// Find all HTML files in dist
function findHtmlFiles(dir) {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findHtmlFiles(fullPath));
    } else if (entry.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  
  return results;
}

// Process each HTML file
const htmlFiles = findHtmlFiles(DIST);
let totalProcessed = 0;

for (const htmlPath of htmlFiles) {
  let html = readFileSync(htmlPath, 'utf8');
  let modified = false;
  let figureCount = 0;
  
  // Find all mermaid code blocks: <pre class="..."><code class="language-mermaid ...">...
  const mermaidRegex = /<pre[^>]*><code[^>]*class="[^"]*language-mermaid[^"]*"[^>]*>([\s\S]*?)<\/code><\/pre>/g;
  
  html = html.replace(mermaidRegex, (match, codeContent) => {
    // Decode HTML entities in the code
    const src = codeContent
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, '&')
      .trim();
    
    const hash = diagramHash(src);
    
    // Check for SVG files
    const lightPath = join(SVG_DIR, `${hash}-light.svg`);
    const darkPath = join(SVG_DIR, `${hash}-dark.svg`);
    
    if (!existsSync(lightPath) || !existsSync(darkPath)) {
      console.warn(`[post-build-mermaid] Missing SVG for hash ${hash}`);
      return match; // Keep original
    }
    
    // Read and process SVGs
    let lightSvg = readFileSync(lightPath, 'utf8');
    let darkSvg = readFileSync(darkPath, 'utf8');
    
    // Extract alt and caption from source (they're in comments now)
    const altMatch = src.match(/%%\s*alt:\s*(.+?)(?:\n|%%)/);
    const captionMatch = src.match(/%%\s*caption:\s*(.+?)(?:\n|%%)/);
    const alt = altMatch ? altMatch[1].trim() : 'Diagram';
    const caption = captionMatch ? captionMatch[1].trim() : '';
    
    // Process SVGs
    const processSvg = (svg, mode) => {
      const idMatch = svg.match(/\sid="([^"]*)"/);
      const viewBoxMatch = svg.match(/\sviewBox="([^"]*)"/);
      const widthMatch = viewBoxMatch ? viewBoxMatch[1].match(/[\d.]+\s+[\d.]+\s+([\d.]+)/) : null;
      
      const id = idMatch ? idMatch[1] : '';
      const viewBox = viewBoxMatch ? viewBoxMatch[1] : '';
      const width = widthMatch ? Math.round(Number(widthMatch[1])) : 640;
      const isNarrow = width <= 420;
      
      const escAlt = alt.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      const newTag = `<svg${id ? ` id="${id}"` : ''} xmlns="http://www.w3.org/2000/svg" class="mmd-${mode}" viewBox="${viewBox}" role="img" aria-label="${escAlt}" focusable="false" style="--w:${width}px"${isNarrow ? ' data-narrow' : ''}>`;
      
      return svg.replace(/<svg[^>]*>/, newTag);
    };
    
    lightSvg = processSvg(lightSvg, 'light');
    darkSvg = processSvg(darkSvg, 'dark');
    
    figureCount++;
    modified = true;
    
    return `<figure class="dx-diagram">
  <div class="dx-figure__frame" role="group" tabindex="0" aria-label="Diagram, scrolls horizontally">
    ${lightSvg}
    ${darkSvg}
  </div>${caption ? `
  <figcaption>${caption}</figcaption>` : ''}
</figure>`;
  });
  
  if (modified) {
    writeFileSync(htmlPath, html, 'utf8');
    totalProcessed++;
    console.log(`[post-build-mermaid] Processed ${figureCount} diagrams in ${htmlPath.replace(DIST, '')}`);
  }
}

console.log(`[post-build-mermaid] Complete. Updated ${totalProcessed} files.`);
