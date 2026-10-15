import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const distPath = join(process.cwd(), 'dist');
const llmsPath = join(distPath, 'llms.txt');

if (!existsSync(llmsPath)) {
  console.error('❌ llms.txt not found in dist/');
  process.exit(1);
}

const llmsContent = readFileSync(llmsPath, 'utf-8');

const urlRegex = /https:\/\/devxtools\.dev(\/[^\s]+)/g;
const urls: string[] = [];
let match;

while ((match = urlRegex.exec(llmsContent)) !== null) {
  urls.push(match[1]);
}

console.log(`Found ${urls.length} URLs in llms.txt`);

let hasErrors = false;

for (const url of urls) {
  const normalizedPath = url.endsWith('/') ? url.slice(0, -1) : url;
  
  const possiblePaths = [
    join(distPath, `${normalizedPath}.html`),
    join(distPath, normalizedPath, 'index.html'),
    join(distPath, `${normalizedPath}/index.html`),
  ];

  const exists = possiblePaths.some(p => existsSync(p));

  if (!exists) {
    console.error(`❌ URL ${url} does not have a corresponding built page in dist/`);
    console.error(`   Checked paths:`, possiblePaths);
    hasErrors = true;
  } else {
    console.log(`✓ ${url}`);
  }
}

if (hasErrors) {
  console.error('\n❌ Some URLs in llms.txt do not have corresponding pages in dist/');
  process.exit(1);
}

console.log('\n✓ All URLs in llms.txt have corresponding pages in dist/');
