import type { PagesFunction } from '@cloudflare/workers-types';
import { badge } from './badge-generator';

// Validate slug against catalog (basic check - matches YAML filename pattern)
function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

export const onRequest: PagesFunction = async (context) => {
  const { request, params } = context;
  
  // Extract slug from path
  let slug = params.slug as string;
  
  // Check for -dark suffix (backward compatibility alias)
  let theme: 'light' | 'dark' = 'light';
  if (slug.endsWith('-dark')) {
    slug = slug.replace(/-dark$/, '');
    theme = 'dark';
  }
  
  // Validate slug format
  if (!isValidSlug(slug)) {
    return new Response('Invalid badge slug', { status: 404 });
  }
  
  // Parse query parameters
  const url = new URL(request.url);
  const variantParam = url.searchParams.get('variant');
  const themeParam = url.searchParams.get('theme');
  
  const variant: 'small' | 'large' = 
    variantParam === 'large' ? 'large' : 'small';
  
  // Query param overrides -dark suffix
  if (themeParam === 'dark' || themeParam === 'light') {
    theme = themeParam;
  }
  
  // Generate badge
  const svg = badge({
    slug,
    label: 'listed',
    variant,
    theme,
  });
  
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
