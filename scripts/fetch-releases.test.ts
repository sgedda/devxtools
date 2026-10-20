import { describe, it, expect } from 'vitest';
import { parseVersion, isStableVersion, normalizeVersion, extractSemver, isPlainSemver } from './fetch-releases';

describe('extractSemver', () => {
  it('extracts semver from simple tags', () => {
    expect(extractSemver('v1.2.3')).toBe('1.2.3');
    expect(extractSemver('1.2.3')).toBe('1.2.3');
    expect(extractSemver('10.5.2')).toBe('10.5.2');
  });

  it('extracts semver from monorepo tags with prefixes', () => {
    expect(extractSemver('cli-2.11.0')).toBe('2.11.0');
    expect(extractSemver('core@13.3.1')).toBe('13.3.1');
    expect(extractSemver('reactotron-react-native@5.3.1')).toBe('5.3.1');
    expect(extractSemver('rel/v5.6.3')).toBe('5.6.3');
    expect(extractSemver('axios-v1.10.32')).toBe('1.10.32');
  });

  it('skips prerelease versions', () => {
    expect(extractSemver('v1.0.0-beta.15')).toBeNull();
    expect(extractSemver('2.1.0-alpha')).toBeNull();
    expect(extractSemver('cli-3.0.0-rc.1')).toBeNull();
  });

  it('handles two-part versions at end of tag', () => {
    expect(extractSemver('cli-1.2')).toBe('1.2');
    expect(extractSemver('package@10.5')).toBe('10.5');
  });

  it('returns null for invalid versions', () => {
    expect(extractSemver('invalid')).toBeNull();
    expect(extractSemver('latest')).toBeNull();
    expect(extractSemver('')).toBeNull();
  });
});

describe('normalizeVersion', () => {
  it('extracts clean semver from complex tags', () => {
    expect(normalizeVersion('cli-2.11.0')).toBe('2.11.0');
    expect(normalizeVersion('core@13.3.1')).toBe('13.3.1');
    expect(normalizeVersion('rel/v5.6.3')).toBe('5.6.3');
  });

  it('removes leading v from simple versions', () => {
    expect(normalizeVersion('v1.2.3')).toBe('1.2.3');
    expect(normalizeVersion('v10.5.2')).toBe('10.5.2');
  });

  it('leaves clean versions unchanged', () => {
    expect(normalizeVersion('1.2.3')).toBe('1.2.3');
    expect(normalizeVersion('3.14.159')).toBe('3.14.159');
  });
});

describe('isPlainSemver', () => {
  it('accepts valid plain semver', () => {
    expect(isPlainSemver('1.2.3')).toBe(true);
    expect(isPlainSemver('10.5.2')).toBe(true);
    expect(isPlainSemver('0.0.1')).toBe(true);
    expect(isPlainSemver('123.456.789')).toBe(true);
  });

  it('accepts two-part versions', () => {
    expect(isPlainSemver('1.2')).toBe(true);
    expect(isPlainSemver('10.5')).toBe(true);
  });

  it('rejects versions with prefixes or suffixes', () => {
    expect(isPlainSemver('v1.2.3')).toBe(false);
    expect(isPlainSemver('cli-2.11.0')).toBe(false);
    expect(isPlainSemver('core@13.3.1')).toBe(false);
    expect(isPlainSemver('1.0.0-beta')).toBe(false);
  });

  it('rejects invalid versions', () => {
    expect(isPlainSemver('1.2.3.4')).toBe(false);
    expect(isPlainSemver('invalid')).toBe(false);
    expect(isPlainSemver('')).toBe(false);
  });
});

describe('parseVersion', () => {
  it('parses simple semantic versions', () => {
    expect(parseVersion('1.2.3')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: false,
    });
  });

  it('parses versions with v prefix', () => {
    expect(parseVersion('v2.5.8')).toEqual({
      major: 2,
      minor: 5,
      patch: 8,
      prerelease: false,
    });
  });

  it('parses prerelease versions', () => {
    expect(parseVersion('1.0.0-alpha.1')).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
      prerelease: true,
    });

    expect(parseVersion('v3.2.1-beta')).toEqual({
      major: 3,
      minor: 2,
      patch: 1,
      prerelease: true,
    });

    expect(parseVersion('2.0.0-rc.5')).toEqual({
      major: 2,
      minor: 0,
      patch: 0,
      prerelease: true,
    });
  });

  it('returns null for invalid versions', () => {
    expect(parseVersion('1.2.3.4')).toBeNull();
    expect(parseVersion('invalid')).toBeNull();
    expect(parseVersion('v1.x.3')).toBeNull();
    expect(parseVersion('')).toBeNull();
  });

  it('handles large version numbers', () => {
    expect(parseVersion('123.456.789')).toEqual({
      major: 123,
      minor: 456,
      patch: 789,
      prerelease: false,
    });
  });
});

describe('isStableVersion', () => {
  it('identifies stable versions', () => {
    expect(isStableVersion('1.0.0')).toBe(true);
    expect(isStableVersion('v2.3.4')).toBe(true);
    expect(isStableVersion('10.5.2')).toBe(true);
  });

  it('rejects prerelease versions', () => {
    expect(isStableVersion('1.0.0-alpha')).toBe(false);
    expect(isStableVersion('2.1.0-beta.1')).toBe(false);
    expect(isStableVersion('v3.0.0-rc')).toBe(false);
    expect(isStableVersion('1.5.0-next.20241015')).toBe(false);
  });

  it('rejects invalid versions', () => {
    expect(isStableVersion('invalid')).toBe(false);
    expect(isStableVersion('')).toBe(false);
    expect(isStableVersion('latest')).toBe(false);
  });
});

describe('releases.json validation', () => {
  it('should not contain release dates equal to script execution time', () => {
    const fs = require('fs');
    const path = require('path');
    
    const releasesPath = path.join(process.cwd(), 'src/data/releases.json');
    
    if (!fs.existsSync(releasesPath)) {
      return;
    }
    
    const releases = JSON.parse(fs.readFileSync(releasesPath, 'utf-8'));
    const lastUpdated = new Date(releases.lastUpdated);
    
    const invalidEntries: string[] = [];
    
    for (const [slug, release] of Object.entries(releases.tools)) {
      const releaseDate = new Date((release as any).releaseDate);
      const timeDiff = Math.abs(releaseDate.getTime() - lastUpdated.getTime());
      
      if (timeDiff < 60000) {
        invalidEntries.push(`${slug}: ${(release as any).releaseDate} (within 1 minute of lastUpdated: ${releases.lastUpdated})`);
      }
    }
    
    if (invalidEntries.length > 0) {
      throw new Error(`Found ${invalidEntries.length} release(s) with dates equal to script execution time:\n${invalidEntries.join('\n')}`);
    }
  });
});

describe('release summary lifecycle', async () => {
  const { mergeRelease, expandChangelogUrl, candidateReleaseTags } = await import('./fetch-releases');
  const base = { releaseDate: '2026-10-01T00:00:00Z', releaseUrl: 'https://x', source: 'npm' as const };

  it('keeps reviewed summary and stored date when the version is unchanged', () => {
    const existing = { ...base, version: '1.0.0', summary: 'S', breaking: true, status: 'reviewed' as const, releaseDate: '2026-09-30T12:00:00Z' };
    const merged = mergeRelease({ ...base, version: '1.0.0' }, existing);
    expect(merged.summary).toBe('S');
    expect(merged.breaking).toBe(true);
    expect(merged.status).toBe('reviewed');
    expect(merged.releaseDate).toBe('2026-09-30T12:00:00Z');
  });

  it('clears the summary and resets to draft when the version changes', () => {
    const existing = { ...base, version: '1.0.0', summary: 'S', breaking: true, status: 'reviewed' as const };
    const merged = mergeRelease({ ...base, version: '1.0.1' }, existing);
    expect(merged.summary).toBeUndefined();
    expect(merged.breaking).toBeUndefined();
    expect(merged.status).toBe('draft');
  });

  it('never marks a fetched (auto-generated) entry as reviewed', () => {
    const merged = mergeRelease({ ...base, version: '2.0.0', summary: 'auto', status: 'reviewed' });
    expect(merged.status).toBe('draft');
    expect(merged.summary).toBeUndefined();
  });

  it('expands changelog URL templates and candidate tags', () => {
    expect(expandChangelogUrl('https://d/changelog#{versionDashed}', '16.2.0')).toBe('https://d/changelog#16-2-0');
    expect(candidateReleaseTags('2.65.1', '@redocly/cli')).toEqual(['v2.65.1', '2.65.1', '@redocly/cli@2.65.1']);
  });
});

describe('release history: sync appends instead of overwriting', async () => {
  const { syncTool, appendHistory } = await import('./fetch-releases');
  const reviewed = {
    version: '1.0.0', releaseDate: '2026-10-01T00:00:00Z', releaseUrl: 'https://gh/r/v1.0.0',
    source: 'npm' as const, summary: 'Reviewed text', breaking: true, status: 'reviewed' as const,
  };

  it('moves the current entry into history (with its reviewed summary) when a new version lands', () => {
    const fetched = { version: '1.1.0', releaseDate: '2026-10-10T00:00:00Z', releaseUrl: 'https://gh/r/v1.1.0', source: 'npm' as const };
    const { current, history } = syncTool(fetched, reviewed, []);
    expect(current.version).toBe('1.1.0');
    expect(current.status).toBe('draft');
    expect(current.summary).toBeUndefined();
    expect(history).toHaveLength(1);
    expect(history[0]).toEqual(reviewed);
  });

  it('keeps all earlier history entries, newest first', () => {
    const older = { ...reviewed, version: '0.9.0', releaseDate: '2026-09-01T00:00:00Z' };
    const fetched = { version: '1.1.0', releaseDate: '2026-10-10T00:00:00Z', releaseUrl: 'x', source: 'npm' as const };
    const { history } = syncTool(fetched, reviewed, [older]);
    expect(history.map(h => h.version)).toEqual(['1.0.0', '0.9.0']);
  });

  it('does not touch history when the version is unchanged', () => {
    const prior = [{ ...reviewed, version: '0.9.0' }];
    const { current, history } = syncTool({ ...reviewed, summary: undefined, status: undefined, breaking: undefined }, reviewed, prior);
    expect(history).toBe(prior);
    expect(current.summary).toBe('Reviewed text');
    expect(current.status).toBe('reviewed');
  });

  it('never duplicates a version and never downgrades a reviewed history entry', () => {
    const draftCopy = { ...reviewed, summary: undefined, status: 'draft' as const };
    expect(appendHistory([reviewed], draftCopy)).toEqual([reviewed]);
    expect(appendHistory([draftCopy], reviewed)[0].status).toBe('reviewed');
    expect(appendHistory([draftCopy], reviewed)[0].summary).toBe('Reviewed text');
  });
});
