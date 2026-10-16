import { readFileSync } from 'fs';
import { join } from 'path';

interface ReleaseInfo {
  version: string;
  releaseDate: string;
  releaseUrl: string;
  source: string;
}

interface ReleasesData {
  lastUpdated: string;
  tools: Record<string, ReleaseInfo>;
}

function isPlainSemver(version: string): boolean {
  return /^\d+\.\d+(?:\.\d+)?$/.test(version);
}

function main() {
  const releasesPath = join(process.cwd(), 'src/data/releases.json');
  
  let releases: ReleasesData;
  try {
    releases = JSON.parse(readFileSync(releasesPath, 'utf-8'));
  } catch (error) {
    console.error('Failed to read releases.json:', error);
    process.exit(1);
  }
  
  const invalidVersions: Array<{ slug: string; version: string; reason: string }> = [];
  
  for (const [slug, release] of Object.entries(releases.tools)) {
    if (!isPlainSemver(release.version)) {
      let reason = 'Not plain semver (X.Y.Z or X.Y)';
      
      if (release.version.includes('-')) {
        reason = 'Contains prerelease suffix';
      } else if (release.version.match(/[a-zA-Z@]/)) {
        reason = 'Contains prefix or special characters';
      }
      
      invalidVersions.push({
        slug,
        version: release.version,
        reason,
      });
    }
  }
  
  if (invalidVersions.length > 0) {
    console.error('\n❌ Validation failed: releases.json contains invalid versions\n');
    console.error('All versions must be plain semver (X.Y.Z or X.Y) without prefixes or suffixes.\n');
    
    for (const { slug, version, reason } of invalidVersions) {
      console.error(`  ${slug}: "${version}" - ${reason}`);
    }
    
    console.error(`\n${invalidVersions.length} invalid version(s) found.\n`);
    process.exit(1);
  }
  
  console.log(`✓ All ${Object.keys(releases.tools).length} versions in releases.json are valid plain semver`);
}

main();
