import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const distPath = join(process.cwd(), 'dist');
const llmsPath = join(distPath, 'llms.txt');
const redirectsPath = join(process.cwd(), 'public', '_redirects');
const sitemapPath = join(distPath, 'sitemap-0.xml');

if (!existsSync(llmsPath)) {
  console.error('❌ llms.txt not found in dist/');
  process.exit(1);
}

if (!existsSync(sitemapPath)) {
  console.error('❌ sitemap-0.xml not found in dist/');
  process.exit(1);
}

const llmsContent = readFileSync(llmsPath, 'utf-8');
const redirectsContent = existsSync(redirectsPath) ? readFileSync(redirectsPath, 'utf-8') : '';
const sitemapContent = readFileSync(sitemapPath, 'utf-8');

const urlRegex = /https:\/\/devxtools\.dev(\/[^\s)]*)/g; // bare URLs or markdown links
const llmsUrls: string[] = [];
let match;

while ((match = urlRegex.exec(llmsContent)) !== null) {
  const url = match[1] || '/';
  if (!llmsUrls.includes(url)) {
    llmsUrls.push(url);
  }
}

console.log(`Found ${llmsUrls.length} URLs in llms.txt\n`);

const redirectSources = new Set<string>();
const redirectLines = redirectsContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
for (const line of redirectLines) {
  const parts = line.trim().split(/\s+/);
  if (parts.length >= 2) {
    redirectSources.add(parts[0]);
  }
}

const sitemapUrlMatches = sitemapContent.matchAll(/<loc>([^<]+)<\/loc>/g);
const sitemapUrls = Array.from(sitemapUrlMatches)
  .map(m => m[1].replace('https://devxtools.dev', ''))
  .filter(url => !url.startsWith('/tools/'));

console.log(`Found ${sitemapUrls.length} non-tool URLs in sitemap\n`);

let hasErrors = false;

console.log('Checking llms.txt URLs...\n');

for (const url of llmsUrls) {
  if (redirectSources.has(url)) {
    console.error(`❌ ${url} is a redirect source in _redirects (should not be in llms.txt)`);
    hasErrors = true;
    continue;
  }

  const normalizedPath = url.endsWith('/') ? url.slice(0, -1) : url;
  
  const possiblePaths = [
    join(distPath, `${normalizedPath}.html`),
    join(distPath, normalizedPath, 'index.html'),
    join(distPath, `${normalizedPath}/index.html`),
  ];

  const exists = possiblePaths.some(p => existsSync(p));

  if (!exists) {
    console.error(`❌ ${url} does not have a corresponding built page in dist/`);
    hasErrors = true;
  } else {
    console.log(`✓ ${url}`);
  }
}

console.log('\nChecking sitemap coverage...\n');

const llmsUrlSet = new Set(llmsUrls);
const missingSitemapUrls = sitemapUrls.filter(url => !llmsUrlSet.has(url));

if (missingSitemapUrls.length > 0) {
  console.error(`❌ ${missingSitemapUrls.length} sitemap URLs missing from llms.txt:\n`);
  missingSitemapUrls.forEach(url => console.error(`   - ${url}`));
  hasErrors = true;
} else {
  console.log('✓ All non-tool sitemap URLs are present in llms.txt');
}

if (hasErrors) {
  console.error('\n❌ Validation failed');
  process.exit(1);
}

console.log('\n✓ All validations passed');
