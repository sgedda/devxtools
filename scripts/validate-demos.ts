#!/usr/bin/env tsx

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

interface DemoReference {
  file: string;
  project: string;
  line: number;
}

async function findDemoReferences(): Promise<DemoReference[]> {
  const references: DemoReference[] = [];
  
  // Find all Astro files
  const astroFiles = await glob('src/**/*.astro', { ignore: 'node_modules/**' });
  
  for (const file of astroFiles) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    // Look for RunIt component usage
    // Pattern: <RunIt project="..." or data-project="..."
    const patterns = [
      /project=["']([^"']+)["']/g,
      /data-project=["']([^"']+)["']/g,
    ];
    
    lines.forEach((line, index) => {
      for (const pattern of patterns) {
        const matches = line.matchAll(pattern);
        for (const match of matches) {
          references.push({
            file,
            project: match[1],
            line: index + 1,
          });
        }
      }
    });
  }
  
  return references;
}

function validateDemoExists(project: string): boolean {
  const demoPath = join(process.cwd(), 'demos', project);
  const packageJsonPath = join(demoPath, 'package.json');
  
  if (!existsSync(demoPath)) {
    return false;
  }
  
  if (!existsSync(packageJsonPath)) {
    console.error(`  ✗ Demo ${project} exists but has no package.json`);
    return false;
  }
  
  return true;
}

async function main() {
  console.log('Validating demo project references...\n');
  
  const references = await findDemoReferences();
  
  if (references.length === 0) {
    console.log('No demo references found.');
    return;
  }
  
  console.log(`Found ${references.length} demo reference(s):\n`);
  
  let hasErrors = false;
  const seenProjects = new Set<string>();
  
  for (const ref of references) {
    if (seenProjects.has(ref.project)) {
      continue;
    }
    seenProjects.add(ref.project);
    
    const exists = validateDemoExists(ref.project);
    
    if (exists) {
      console.log(`  ✓ demos/${ref.project}/`);
    } else {
      console.error(`  ✗ demos/${ref.project}/ (referenced in ${ref.file}:${ref.line})`);
      hasErrors = true;
    }
  }
  
  console.log('');
  
  if (hasErrors) {
    console.error('Validation failed: Some referenced demos do not exist.');
    process.exit(1);
  }
  
  console.log('All demo references are valid!');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
