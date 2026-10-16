import { describe, it, expect } from 'vitest';
import { parseVersion, isStableVersion, normalizeVersion } from './fetch-releases';

describe('normalizeVersion', () => {
  it('removes leading v from versions', () => {
    expect(normalizeVersion('v1.2.3')).toBe('1.2.3');
    expect(normalizeVersion('v10.5.2')).toBe('10.5.2');
    expect(normalizeVersion('v2.0.0-beta.1')).toBe('2.0.0-beta.1');
  });

  it('leaves versions without v unchanged', () => {
    expect(normalizeVersion('1.2.3')).toBe('1.2.3');
    expect(normalizeVersion('3.14.159')).toBe('3.14.159');
    expect(normalizeVersion('cli-2.11.0')).toBe('cli-2.11.0');
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
    expect(parseVersion('1.2')).toBeNull();
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
    expect(isStableVersion('1.2')).toBe(false);
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
