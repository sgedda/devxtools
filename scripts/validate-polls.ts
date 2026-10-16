import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { pollSchema } from '../workers/votes/src/schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pollsDir = path.resolve(__dirname, '../src/data/polls');

function validatePolls() {
  console.log('Validating polls...');

  const files = fs.readdirSync(pollsDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

  if (files.length === 0) {
    console.error('❌ No poll files found');
    process.exit(1);
  }

  let errors = 0;
  const seenSlugs = new Set<string>();

  for (const file of files) {
    const filePath = path.join(pollsDir, file);
    console.log(`\nValidating ${file}...`);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = YAML.parse(content);
      const poll = pollSchema.parse(data);

      if (seenSlugs.has(poll.slug)) {
        console.error(`  ❌ Duplicate poll slug: ${poll.slug}`);
        errors++;
        continue;
      }
      seenSlugs.add(poll.slug);

      const optionSlugs = new Set<string>();
      for (const option of poll.options) {
        if (optionSlugs.has(option.slug)) {
          console.error(`  ❌ Duplicate option slug in poll ${poll.slug}: ${option.slug}`);
          errors++;
        }
        optionSlugs.add(option.slug);
      }

      console.log(`  ✓ Poll: ${poll.slug}`);
      console.log(`  ✓ Question: ${poll.question}`);
      console.log(`  ✓ Options: ${poll.options.length}`);
    } catch (error) {
      console.error(`  ❌ Validation error in ${file}:`, error);
      errors++;
    }
  }

  if (errors > 0) {
    console.error(`\n❌ Validation failed with ${errors} error(s)`);
    process.exit(1);
  }

  console.log(`\n✓ All ${files.length} poll(s) validated successfully`);
}

validatePolls();
