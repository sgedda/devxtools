import type { Tool } from './schema';

const HUES = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444'];

// Simple Icons mapping for known tools
const SIMPLE_ICONS_MAP: Record<string, string> = {
  'mockserviceworker': 'msw',
  'postman': 'postman',
  'cypress': 'cypress',
  'playwright': 'playwright',
  'appium': 'appium',
  'jest': 'jest',
  'vitest': 'vitest',
};

export function getLogoForTool(tool: Tool): { type: 'icon' | 'gradient'; value: string; initials: string } {
  const initials = tool.name.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();
  
  // Try to find a Simple Icons match
  const slug = tool.slug.toLowerCase();
  const iconSlug = SIMPLE_ICONS_MAP[slug] || slug;
  
  // Return icon info if tool is known to have a Simple Icon
  if (SIMPLE_ICONS_MAP[slug] || ['msw', 'postman', 'cypress', 'playwright', 'appium'].includes(slug)) {
    return {
      type: 'icon',
      value: iconSlug,
      initials,
    };
  }
  
  // Otherwise, generate a gradient based on the tool name
  const hash = [...tool.name].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = HUES[hash % HUES.length];
  
  return {
    type: 'gradient',
    value: color,
    initials,
  };
}

export function formatStars(stars: number): string {
  if (stars >= 1000) {
    return (stars / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return String(stars);
}

export function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (days < 1) return 'today';
  if (days < 2) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} mo ago`;
  }
  const years = Math.floor(days / 365);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

export function getLicenseBadgeClass(license?: string): string {
  if (!license) return '';
  
  if (license === 'Proprietary') {
    return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30';
  }
  
  return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30';
}

export const CATEGORY_ICONS: Record<string, string> = {
  'http-interception': 'radar',
  'mock-server': 'server',
  'spec-based-mocking': 'file-code-2',
  'contract-testing': 'handshake',
  'test-data-generation': 'database',
  'hosted-mocks': 'cloud',
  'record-replay': 'disc-3',
  'api-client': 'send',
  'openapi-tooling': 'file-json',
  'sdk-generator': 'code-2',
  'e2e-testing': 'route',
  'load-testing': 'zap',
  'error-monitoring': 'alert-circle',
  'distributed-tracing': 'git-branch',
  'log-aggregation': 'layers',
  'application-logging': 'file-text',
  'network-debugging': 'activity',
};

export const SECTION_ICONS: Record<string, string> = {
  'mocking-test-data': 'flask-conical',
  'api-development': 'code',
  'testing': 'bug',
  'observability': 'eye',
};
