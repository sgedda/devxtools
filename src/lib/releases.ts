import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface ReleaseInfo {
  version: string;
  releaseDate: string;
  releaseUrl: string;
  source: 'github' | 'npm' | 'pypi';
  /** Display name override, e.g. "Sentry self-hosted" when the tracked release is a sub-product. */
  label?: string;
  /** Editor-written summary; only rendered when status is 'reviewed'. */
  summary?: string;
  breaking?: boolean;
  /** 'draft' = not reviewed (the sync script always writes draft for new versions). */
  status?: 'draft' | 'reviewed';
}

export interface ReleasesData {
  lastUpdated: string;
  tools: Record<string, ReleaseInfo>;
}

let cachedReleases: ReleasesData | null = null;

export function getReleases(): ReleasesData {
  if (cachedReleases) {
    return cachedReleases;
  }

  try {
    const releasesFile = join(process.cwd(), 'src/data/releases.json');
    const content = readFileSync(releasesFile, 'utf-8');
    cachedReleases = JSON.parse(content);
    return cachedReleases!;
  } catch (error) {
    console.warn('Failed to load releases.json:', error);
    return { lastUpdated: '', tools: {} };
  }
}

export function getToolRelease(slug: string): ReleaseInfo | null {
  const releases = getReleases();
  return releases.tools[slug] || null;
}

export function getRecentReleases(limit: number = 10): Array<{ slug: string; release: ReleaseInfo }> {
  const releases = getReleases();
  
  const entries = Object.entries(releases.tools)
    .map(([slug, release]) => ({ slug, release }))
    .sort((a, b) => {
      const dateA = new Date(a.release.releaseDate).getTime();
      const dateB = new Date(b.release.releaseDate).getTime();
      return dateB - dateA;
    });
  
  return entries.slice(0, limit);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Render the small inline-markdown subset used in summaries (`code`, **bold**) to safe HTML. */
export function renderSummaryHtml(summary: string): string {
  return escapeHtml(summary)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

/** Earlier releases for a tool (newest first), from src/data/release-history/<slug>.json. */
export function getReleaseHistory(slug: string, limit?: number): ReleaseInfo[] {
  const file = join(process.cwd(), 'src/data/release-history', `${slug}.json`);
  if (!existsSync(file)) return [];
  try {
    const history: ReleaseInfo[] = JSON.parse(readFileSync(file, 'utf-8'));
    return limit === undefined ? history : history.slice(0, limit);
  } catch (error) {
    console.warn(`Failed to load release history for ${slug}:`, error);
    return [];
  }
}

export function releaseLinkLabel(url: string): string {
  if (url.startsWith('https://www.npmjs.com/')) return 'npm';
  if (url.startsWith('https://pypi.org/')) return 'PyPI';
  return 'Release notes';
}
