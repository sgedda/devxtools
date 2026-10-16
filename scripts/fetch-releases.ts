import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';
import { ToolSchema } from '../src/lib/schema';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const TOOLS_DIR = join(process.cwd(), 'src/data/tools');
const RELEASES_FILE = join(process.cwd(), 'src/data/releases.json');

interface ReleaseInfo {
  version: string;
  releaseDate: string;
  releaseUrl: string;
  source: 'github' | 'npm' | 'pypi';
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
    
    if (!latestVersion || !isStableVersion(latestVersion)) {
      return null;
    }
    
    const versionData = data.versions[latestVersion];
    
    return {
      version: latestVersion,
      releaseDate: data.time[latestVersion],
      releaseUrl: `https://www.npmjs.com/package/${packageName}/v/${latestVersion}`,
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

async function fetchToolRelease(tool: any): Promise<ReleaseInfo | null> {
  if (tool.pypiPackage) {
    return await fetchPyPiRelease(tool.pypiPackage);
  }
  
  if (tool.npmPackage) {
    return await fetchNpmRelease(tool.npmPackage);
  }
  
  if (tool.repo && tool.repo.includes('github.com')) {
    return await fetchGitHubRelease(tool.repo);
  }
  
  return null;
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
      newData.tools[tool.slug] = release;
      
      const existingRelease = existingData.tools[tool.slug];
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
