import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { pollSchema } from '../src/schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pollsDir = path.resolve(__dirname, '../../../src/data/polls');

async function loadPolls() {
  const files = fs.readdirSync(pollsDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  const polls = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(pollsDir, file), 'utf-8');
    const data = YAML.parse(content);
    const validated = pollSchema.parse(data);
    polls.push(validated);
  }

  return polls;
}

async function seedPolls() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '2da5448d9c00373519c97d8368d08ae3';
  const databaseId = process.env.DATABASE_ID;

  if (!databaseId) {
    console.error('DATABASE_ID environment variable is required');
    console.error('Get it from: wrangler d1 list');
    process.exit(1);
  }

  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!apiToken) {
    console.error('CLOUDFLARE_API_TOKEN environment variable is required');
    process.exit(1);
  }

  const polls = await loadPolls();
  console.log(`Loading ${polls.length} poll(s)...`);

  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  for (const poll of polls) {
    console.log(`Upserting poll: ${poll.slug}`);

    const insertPollSql = `
      INSERT INTO polls (slug, question, status)
      VALUES ('${poll.slug}', '${poll.question.replace(/'/g, "''")}', '${poll.status}')
      ON CONFLICT(slug) DO UPDATE SET
        question = excluded.question,
        status = excluded.status
    `;

    const pollResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: insertPollSql }),
    });

    if (!pollResponse.ok) {
      console.error(`Failed to upsert poll ${poll.slug}:`, await pollResponse.text());
      process.exit(1);
    }

    const getPollIdSql = `SELECT id FROM polls WHERE slug = '${poll.slug}'`;
    const pollIdResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: getPollIdSql }),
    });

    const pollIdData = await pollIdResponse.json();
    const pollId = pollIdData.result[0].results[0].id;

    const getExistingOptionsSql = `SELECT slug FROM options WHERE poll_id = ${pollId}`;
    const existingOptionsResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: getExistingOptionsSql }),
    });

    const existingOptionsData = await existingOptionsResponse.json();
    const existingSlugs = new Set(
      existingOptionsData.result[0].results.map((r: { slug: string }) => r.slug)
    );

    for (const option of poll.options) {
      if (existingSlugs.has(option.slug)) {
        const updateSql = `
          UPDATE options
          SET label = '${option.label.replace(/'/g, "''")}',
              tool_slug = ${option.tool_slug ? `'${option.tool_slug}'` : 'NULL'},
              sort = ${option.sort}
          WHERE poll_id = ${pollId} AND slug = '${option.slug}'
        `;
        await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sql: updateSql }),
        });
      } else {
        const insertSql = `
          INSERT INTO options (poll_id, slug, label, tool_slug, sort)
          VALUES (${pollId}, '${option.slug}', '${option.label.replace(/'/g, "''")}',
                  ${option.tool_slug ? `'${option.tool_slug}'` : 'NULL'}, ${option.sort})
        `;
        await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sql: insertSql }),
        });
      }
    }

    console.log(`  ✓ Upserted ${poll.options.length} option(s)`);
  }

  console.log('✓ All polls seeded successfully');
}

seedPolls().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
