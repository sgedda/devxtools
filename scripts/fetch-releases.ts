import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';
import { ToolSchema } from '../src/lib/schema';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const TOOLS_DIR = join(process.cwd(), 'src/data/tools');
const RELEASES_FILE = join(process.cwd(), 'src/data/releases.json');
const HISTORY_DIR = join(process.cwd(), 'src/data/release-history');

interface ReleaseInfo {
  version: string;
  releaseDate: string;
  releaseUrl: string;
  source: 'github' | 'npm' | 'pypi';
  label?: string;
  summary?: string;
  breaking?: boolean;
  status?: 'draft' | 'reviewed';
}

interface ReleasesData {
  lastUpdated: string;
  tools: Record<string, ReleaseInfo>;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
        const resetTime = response.headers.get('x-ratelimit-reset');
        if (resetTime) {
          const waitTime = parseInt(resetTime) * 1000 - Date.now();
          if (waitTime > 0 && waitTime < 3600000) {
            console.log(`Rate limited. Waiting ${Math.ceil(waitTime / 1000)}s...`);
            await sleep(waitTime + 1000);
            continue;
          }
        }
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, i));
    }
  }
  throw new Error('Max retries exceeded');
}

export function extractSemver(tagOrVersion: string): string | null {
  const stablePatterns = [
    /(\d+\.\d+\.\d+)$/,
    /(\d+\.\d+)$/,
  ];
  
  for (const pattern of stablePatterns) {
    const match = tagOrVersion.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

export function normalizeVersion(version: string): string {
  const extracted = extractSemver(version);
  return extracted || version.replace(/^v/, '');
}

export function parseVersion(version: string): { major: number; minor: number; patch: number; prerelease: boolean } | null {
  const normalized = version.replace(/^v/, '');
  const semverMatch = normalized.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!semverMatch) return null;
  
  return {
    major: parseInt(semverMatch[1]),
    minor: parseInt(semverMatch[2]),
    patch: parseInt(semverMatch[3]),
    prerelease: !!semverMatch[4],
  };
}

export function isStableVersion(version: string): boolean {
  const extracted = extractSemver(version);
  if (extracted) {
    return true;
  }
  
  const normalized = version.replace(/^v/, '');
  const parsed = parseVersion(normalized);
  return parsed !== null && !parsed.prerelease;
}

export function isPlainSemver(version: string): boolean {
  return /^\d+\.\d+(?:\.\d+)?$/.test(version);
}

async function fetchGitHubRelease(repo: string): Promise<ReleaseInfo | null> {
  try {
    const repoPath = repo.replace('https://github.com/', '');
    const url = `https://api.github.com/repos/${repoPath}/releases/latest`;
    
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'devxtools-changelog-bot',
    };
    
    if (GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    }
    
    const response = await fetchWithRetry(url, { headers });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`No releases found for ${repoPath}, trying tags...`);
        return await fetchGitHubTag(repo);
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.draft || data.prerelease) {
      console.log(`Latest release for ${repoPath} is draft/prerelease, looking for stable...`);
      return await fetchLatestStableGitHubRelease(repo);
    }
    
    return {
      version: normalizeVersion(data.tag_name),
      releaseDate: data.published_at,
      releaseUrl: data.html_url,
      source: 'github',
    };
  } catch (error) {
    console.error(`Error fetching GitHub release for ${repo}:`, error);
    return null;
  }
}

async function fetchLatestStableGitHubRelease(repo: string): Promise<ReleaseInfo | null> {
  try {
    const repoPath = repo.replace('https://github.com/', '');
    const url = `https://api.github.com/repos/${repoPath}/releases?per_page=20`;
    
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'devxtools-changelog-bot',
    };
    
    if (GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    }
    
    const response = await fetchWithRetry(url, { headers });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    const stableRelease = data.find((r: any) => !r.draft && !r.prerelease && isStableVersion(r.tag_name));
    
    if (!stableRelease) {
      return null;
    }
    
    return {
      version: normalizeVersion(stableRelease.tag_name),
      releaseDate: stableRelease.published_at,
      releaseUrl: stableRelease.html_url,
      source: 'github',
    };
  } catch (error) {
    console.error(`Error fetching stable GitHub release for ${repo}:`, error);
    return null;
  }
}

async function fetchGitHubTag(repo: string): Promise<ReleaseInfo | null> {
  try {
    const repoPath = repo.replace('https://github.com/', '');
    const url = `https://api.github.com/repos/${repoPath}/tags?per_page=20`;
    
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'devxtools-changelog-bot',
    };
    
    if (GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    }
    
    const response = await fetchWithRetry(url, { headers });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    const stableTag = data.find((t: any) => isStableVersion(t.name));
    
    if (!stableTag) {
      return null;
    }
    
    const commitUrl = `https://api.github.com/repos/${repoPath}/commits/${stableTag.commit.sha}`;
    const commitResponse = await fetchWithRetry(commitUrl, { headers });
    
    if (!commitResponse.ok) {
      console.warn(`Failed to fetch commit date for ${stableTag.name}, skipping...`);
      return null;
    }
    
    const commitData = await commitResponse.json();
    const commitDate = commitData.commit?.committer?.date;
    
    if (!commitDate) {
      console.warn(`No commit date found for ${stableTag.name}, skipping...`);
      return null;
    }
    
    return {
      version: normalizeVersion(stableTag.name),
      releaseDate: commitDate,
      releaseUrl: `https://github.com/${repoPath}/releases/tag/${stableTag.name}`,
      source: 'github',
    };
  } catch (error) {
    console.error(`Error fetching GitHub tags for ${repo}:`, error);
    return null;
  }
}

function compareVersions(v1: string, v2: string): number {
  const p1 = parseVersion(v1);
  const p2 = parseVersion(v2);
  
  if (!p1 || !p2) return 0;
  
  if (p1.major !== p2.major) return p1.major - p2.major;
  if (p1.minor !== p2.minor) return p1.minor - p2.minor;
  return p1.patch - p2.patch;
}

async function fetchNpmRelease(packageName: string): Promise<ReleaseInfo | null> {
  try {
    const url = `https://registry.npmjs.org/${packageName}`;
    
    const response = await fetchWithRetry(url, {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`npm API error: ${response.status}`);
    }
    
    const data = await response.json();
    const latestVersion = data['dist-tags']?.latest;
    
    let targetVersion = latestVersion;
    
    if (!latestVersion || !isStableVersion(latestVersion)) {
      const stableVersions = Object.keys(data.versions || {})
        .filter(v => isStableVersion(v))
        .sort(compareVersions);
      
      if (stableVersions.length === 0) {
        return null;
      }
      
      targetVersion = stableVersions[stableVersions.length - 1];
    }
    
    return {
      version: normalizeVersion(targetVersion),
      releaseDate: data.time[targetVersion],
      releaseUrl: `https://www.npmjs.com/package/${packageName}/v/${targetVersion}`,
      source: 'npm',
    };
  } catch (error) {
    console.error(`Error fetching npm release for ${packageName}:`, error);
    return null;
  }
}

async function fetchPyPiRelease(packageName: string): Promise<ReleaseInfo | null> {
  try {
    const url = `https://pypi.org/pypi/${packageName}/json`;
    
    const response = await fetchWithRetry(url, {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`PyPI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const latestVersion = data.info.version;
    
    if (!isStableVersion(latestVersion)) {
      return null;
    }
    
    const releases = data.releases[latestVersion];
    const releaseDate = releases && releases.length > 0 ? releases[0].upload_time : new Date().toISOString();
    
    return {
      version: latestVersion,
      releaseDate,
      releaseUrl: `https://pypi.org/project/${packageName}/${latestVersion}/`,
      source: 'pypi',
    };
  } catch (error) {
    console.error(`Error fetching PyPI release for ${packageName}:`, error);
    return null;
  }
}

async function fetchGitHubReleaseByTag(repo: string, tags: string[]): Promise<string | null> {
  const repoPath = repo.replace('https://github.com/', '').replace(/\/$/, '');
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'devxtools-changelog-bot',
  };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }
  for (const tag of tags) {
    try {
      const response = await fetchWithRetry(
        `https://api.github.com/repos/${repoPath}/releases/tags/${encodeURIComponent(tag)}`,
        { headers },
      );
      if (response.ok) {
        const data = await response.json();
        if (data.html_url) return data.html_url;
      }
    } catch {
      // try the next candidate tag
    }
  }
  return null;
}

/** Candidate GitHub release tags for a package version (plain, v-prefixed, monorepo pkg@version). */
export function candidateReleaseTags(version: string, packageName?: string): string[] {
  const tags = [`v${version}`, version];
  if (packageName) tags.push(`${packageName}@${version}`);
  return tags;
}

/** Expand a per-tool changelogUrl template: {version} and {versionDashed} (1.2.3 -> 1-2-3). */
export function expandChangelogUrl(template: string, version: string): string {
  return template
    .replaceAll('{versionDashed}', version.replace(/\./g, '-'))
    .replaceAll('{version}', version);
}

/**
 * For npm/PyPI releases, prefer human-readable release notes: the tool's changelogUrl template,
 * then a matching GitHub release on the tool's repo. Falls back to the package page.
 */
async function resolveReleaseNotesUrl(tool: any, release: ReleaseInfo): Promise<ReleaseInfo> {
  if (release.source === 'github') return release;
  if (tool.changelogUrl) {
    return { ...release, releaseUrl: expandChangelogUrl(tool.changelogUrl, release.version) };
  }
  if (tool.repo && tool.repo.includes('github.com')) {
    const pkg = release.source === 'npm' ? tool.npmPackage : tool.pypiPackage;
    const url = await fetchGitHubReleaseByTag(tool.repo, candidateReleaseTags(release.version, pkg));
    if (url) return { ...release, releaseUrl: url };
  }
  return release;
}

async function fetchToolRelease(tool: any): Promise<ReleaseInfo | null> {
  let release: ReleaseInfo | null = null;
  if (tool.releaseRepo) {
    release = await fetchGitHubRelease(tool.releaseRepo);
  } else if (tool.pypiPackage) {
    release = await fetchPyPiRelease(tool.pypiPackage);
  } else if (tool.npmPackage) {
    release = await fetchNpmRelease(tool.npmPackage);
  } else if (tool.repo && tool.repo.includes('github.com')) {
    release = await fetchGitHubRelease(tool.repo);
  }
  if (!release) return null;
  if (!isPlainSemver(release.version)) {
    console.log(`  Skipping non-semver release ${release.version}`);
    return null;
  }
  release = await resolveReleaseNotesUrl(tool, release);
  if (tool.releaseLabel) release.label = tool.releaseLabel;
  return release;
}

/**
 * Merge a freshly fetched release with the stored entry.
 * Same version: keep the stored date and editorial fields (summary, breaking, status).
 * New version: editorial fields are cleared and status is reset to 'draft', so a summary is
 * never carried over to (or published for) a version nobody has reviewed.
 */
export function mergeRelease(fetched: ReleaseInfo, existing?: ReleaseInfo): ReleaseInfo {
  const { summary: _s, breaking: _b, status: _st, ...base } = fetched;
  if (existing && existing.version === fetched.version) {
    const merged: ReleaseInfo = { ...base, releaseDate: existing.releaseDate };
    if (existing.summary !== undefined) merged.summary = existing.summary;
    if (existing.breaking !== undefined) merged.breaking = existing.breaking;
    merged.status = existing.status === 'reviewed' ? 'reviewed' : 'draft';
    return merged;
  }
  return { ...base, status: 'draft' };
}

/**
 * Append a superseded current entry to a tool's history (newest first). Never drops entries:
 * if the version is already in history, the stored entry is kept, and only missing editorial
 * fields (e.g. a reviewed summary) are filled in from the superseded entry.
 */
export function appendHistory(history: ReleaseInfo[], previous: ReleaseInfo): ReleaseInfo[] {
  const idx = history.findIndex(h => h.version === previous.version);
  if (idx >= 0) {
    const merged = [...history];
    const existing = merged[idx];
    merged[idx] = { ...previous, ...existing };
    if (previous.status === 'reviewed' && existing.status !== 'reviewed' && previous.summary) {
      merged[idx] = { ...merged[idx], summary: previous.summary, status: 'reviewed', ...(previous.breaking !== undefined ? { breaking: previous.breaking } : {}) };
    }
    return merged;
  }
  return [{ ...previous }, ...history].sort(
    (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime(),
  );
}

/** Compute the next current entry and history for one tool. Pure; used by main() and tests. */
export function syncTool(
  fetched: ReleaseInfo,
  existing: ReleaseInfo | undefined,
  history: ReleaseInfo[],
): { current: ReleaseInfo; history: ReleaseInfo[] } {
  const historyIdx = history.findIndex(h => h.version === fetched.version);
  const fromHistory = historyIdx >= 0 ? history[historyIdx] : undefined;
  const matchingEntry = existing?.version === fetched.version ? existing : fromHistory;
  const current = mergeRelease(fetched, matchingEntry);
  if (existing && existing.version !== fetched.version) {
    const newHistory = historyIdx >= 0 ? history.filter((_, i) => i !== historyIdx) : history;
    return { current, history: appendHistory(newHistory, existing) };
  }
  return { current, history };
}

function readHistory(slug: string): ReleaseInfo[] {
  const file = join(HISTORY_DIR, `${slug}.json`);
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, 'utf-8'));
}

function writeHistory(slug: string, history: ReleaseInfo[]) {
  if (history.length === 0) return;
  mkdirSync(HISTORY_DIR, { recursive: true });
  writeFileSync(join(HISTORY_DIR, `${slug}.json`), JSON.stringify(history, null, 2) + '\n');
}

async function main() {
  console.log('Fetching latest releases for catalog tools...\n');
  
  const toolFiles = readdirSync(TOOLS_DIR)
    .filter(f => f.endsWith('.yaml'));
  
  let existingData: ReleasesData = {
    lastUpdated: new Date().toISOString(),
    tools: {},
  };
  
  try {
    existingData = JSON.parse(readFileSync(RELEASES_FILE, 'utf-8'));
  } catch {
    console.log('No existing releases.json found, starting fresh.\n');
  }
  
  const newData: ReleasesData = {
    lastUpdated: new Date().toISOString(),
    tools: {},
  };
  
  let successCount = 0;
  let failCount = 0;
  let unchangedCount = 0;
  
  const tools = [];
  for (const file of toolFiles) {
    const content = readFileSync(join(TOOLS_DIR, file), 'utf-8');
    const data = parse(content);
    try {
      const tool = ToolSchema.parse(data);
      tools.push(tool);
    } catch (error) {
      console.error(`Error parsing ${file}:`, error);
    }
  }
  
  for (const tool of tools) {
    console.log(`Fetching release for ${tool.name}...`);
    
    const release = await fetchToolRelease(tool);
    
    if (release) {
      const existingRelease = existingData.tools[tool.slug];
      const history = readHistory(tool.slug);
      const next = syncTool(release, existingRelease, history);
      newData.tools[tool.slug] = next.current;
      if (next.history !== history) writeHistory(tool.slug, next.history);

      if (existingRelease?.version === release.version) {
        unchangedCount++;
        console.log(`  ✓ ${release.version} (unchanged)`);
      } else {
        successCount++;
        console.log(`  ✓ ${release.version} (${existingRelease ? 'updated from ' + existingRelease.version : 'new'})`);
      }
    } else {
      failCount++;
      console.log(`  ✗ No release found`);
      
      if (existingData.tools[tool.slug]) {
        newData.tools[tool.slug] = existingData.tools[tool.slug];
        console.log(`  → Kept existing: ${existingData.tools[tool.slug].version}`);
      }
    }
    
    await sleep(100);
  }
  
  writeFileSync(RELEASES_FILE, JSON.stringify(newData, null, 2) + '\n');
  
  console.log(`\nDone! ${successCount} updated, ${unchangedCount} unchanged, ${failCount} failed.`);
  console.log(`Results written to ${RELEASES_FILE}`);
  
  if (successCount > 0) {
    process.exit(0);
  } else {
    process.exit(0);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
