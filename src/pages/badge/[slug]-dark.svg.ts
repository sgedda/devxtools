import type { APIRoute } from 'astro';
import { getAllTools } from '../../lib/tools';

export function getStaticPaths() {
  const tools = getAllTools();
  return tools.map(tool => ({
    params: { slug: tool.slug },
  }));
}

export const GET: APIRoute = ({ params }) => {
  const { slug } = params;
  
  const actualSlug = slug!.replace(/-dark$/, '');
  const svg = generateBadge(actualSlug, 'dark');
  
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};

function generateBadge(slug: string, theme: 'light' | 'dark'): string {
  const text = 'Featured on devxtools';
  const bgColor = theme === 'dark' ? '#818cf8' : '#6366f1';
  const textColor = '#ffffff';
  
  const textWidth = text.length * 6.5;
  const padding = 20;
  const width = textWidth + padding * 2;
  const height = 28;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" rx="14" fill="${bgColor}"/>
  <text 
    x="${width / 2}" 
    y="${height / 2 + 1}" 
    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
    font-size="12" 
    font-weight="500"
    fill="${textColor}" 
    text-anchor="middle" 
    dominant-baseline="middle"
  >${text}</text>
</svg>`;
}
