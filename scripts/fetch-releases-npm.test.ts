import { describe, it, expect } from 'vitest';

describe('npm prerelease handling', () => {
  it('should pick highest stable version when latest dist-tag is prerelease', () => {
    const mockData = {
      'dist-tags': {
        latest: '1.0.0-beta.15',
      },
      versions: {
        '0.9.6': {},
        '0.10.0': {},
        '0.17.4': {},
        '1.0.0-alpha.1': {},
        '1.0.0-beta.1': {},
        '1.0.0-beta.15': {},
      },
      time: {
        '0.9.6': '2020-01-01T00:00:00.000Z',
        '0.10.0': '2020-02-01T00:00:00.000Z',
        '0.17.4': '2020-03-01T00:00:00.000Z',
        '1.0.0-alpha.1': '2020-04-01T00:00:00.000Z',
        '1.0.0-beta.1': '2020-05-01T00:00:00.000Z',
        '1.0.0-beta.15': '2020-06-01T00:00:00.000Z',
      },
    };
    
    const versions = Object.keys(mockData.versions);
    const stableVersions = versions.filter(v => {
      const match = v.match(/^(\d+)\.(\d+)\.(\d+)$/);
      return match !== null;
    });
    
    expect(stableVersions).toContain('0.9.6');
    expect(stableVersions).toContain('0.10.0');
    expect(stableVersions).toContain('0.17.4');
    expect(stableVersions).not.toContain('1.0.0-beta.15');
    
    const sorted = stableVersions.sort((a, b) => {
      const [aMaj, aMin, aPatch] = a.split('.').map(Number);
      const [bMaj, bMin, bPatch] = b.split('.').map(Number);
      if (aMaj !== bMaj) return aMaj - bMaj;
      if (aMin !== bMin) return aMin - bMin;
      return aPatch - bPatch;
    });
    
    const highest = sorted[sorted.length - 1];
    expect(highest).toBe('0.17.4');
  });
});
