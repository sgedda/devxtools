import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';
import { ToolSchema } from '../src/lib/schema';

const TOOLS_DIR = join(process.cwd(), 'src/data/tools');

function validateCatalog() {
  const files = readdirSync(TOOLS_DIR).filter(f => f.endsWith('.yaml'));
  
  console.log(`Validating ${files.length} tool(s)...\n`);
  
  let hasErrors = false;
  
  for (const file of files) {
    try {
      const content = readFileSync(join(TOOLS_DIR, file), 'utf-8');
      const data = parse(content);
      ToolSchema.parse(data);
      console.log(`✓ ${file}`);
    } catch (error) {
      hasErrors = true;
      console.error(`✗ ${file}`);
      console.error(error);
      console.error('');
    }
  }
  
  if (hasErrors) {
    console.error('\n❌ Validation failed');
    process.exit(1);
  } else {
    console.log('\n✅ All tools are valid');
  }
}

validateCatalog();
