// Check that all guides and comparisons have corresponding OG cards
// DEPENDENCY: Requires PR #13 (brand assets) to be merged first

import { existsSync } from 'fs';
import { join } from 'path';

const guides = [
  'spec-first-mocking-prism-openapi',
  'keeping-mocks-honest-pact',
  'react-native-mocking-mockifyer',
  'realistic-test-data-faker-factories',
  'msw-vs-nock-vs-polly',
];

const comparisons = [
  'msw-vs-nock',
  'msw-vs-nock-vs-polly',
];

let missing = 0;

console.log('Checking guide OG cards...');
for (const slug of guides) {
  const path = join(process.cwd(), 'public', 'og-guides', `${slug}.png`);
  if (!existsSync(path)) {
    console.log(`✗ Missing: og-guides/${slug}.png`);
    missing++;
  } else {
    console.log(`✓ Found: og-guides/${slug}.png`);
  }
}

console.log('\nChecking comparison OG cards...');
for (const slug of comparisons) {
  const path = join(process.cwd(), 'public', 'og-comparisons', `${slug}.png`);
  if (!existsSync(path)) {
    console.log(`✗ Missing: og-comparisons/${slug}.png`);
    missing++;
  } else {
    console.log(`✓ Found: og-comparisons/${slug}.png`);
  }
}

if (missing > 0) {
  console.error(`\n✗ ${missing} OG card(s) missing. Run 'npm run og:articles' to generate them.`);
  process.exit(1);
} else {
  console.log('\n✓ All article OG cards present.');
}
