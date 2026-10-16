import { readFileSync } from 'fs';
import { join } from 'path';

export interface ReleaseInfo {
  version: string;
  releaseDate: string;
  releaseUrl: string;
  source: 'github' | 'npm' | 'pypi';
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
