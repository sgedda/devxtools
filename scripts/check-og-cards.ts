import { existsSync } from 'fs';
import { join } from 'path';
import { getAllTools } from '../src/lib/tools.js';

const OG_DIR = join(process.cwd(), 'public', 'og-tools');

function checkOGCards() {
  const tools = getAllTools();
  const missing: string[] = [];
  
  console.log(`Checking OG cards for ${tools.length} tools...`);
  
  for (const tool of tools) {
    const ogPath = join(OG_DIR, `${tool.slug}.png`);
    if (!existsSync(ogPath)) {
      missing.push(tool.slug);
    }
  }
  
  if (missing.length > 0) {
    console.error(`\n❌ Missing OG cards for ${missing.length} tools:`);
    missing.forEach(slug => console.error(`   - ${slug}.png`));
    console.error(`\nRun 'npm run og' to generate missing cards.\n`);
    process.exit(1);
  }
  
  console.log('✓ All tools have OG cards!');
}

checkOGCards();
