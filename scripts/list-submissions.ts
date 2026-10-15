#!/usr/bin/env node

/**
 * List and export tool submissions from Cloudflare KV
 * 
 * Usage:
 *   # List all submissions
 *   tsx scripts/list-submissions.ts
 * 
 *   # Export YAML stubs to a directory
 *   tsx scripts/list-submissions.ts --export ./submissions
 * 
 * Required environment variables:
 *   CLOUDFLARE_ACCOUNT_ID - Your Cloudflare account ID
 *   CLOUDFLARE_API_TOKEN - API token with KV read permissions
 *   CLOUDFLARE_KV_NAMESPACE_ID - The KV namespace ID for NEWSLETTER_KV
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface Submission {
  id: string;
  toolName: string;
  url: string;
  repoUrl: string;
  category: string;
  pricing: string;
  description: string;
  email: string;
  isMaintainer: boolean;
  mode?: string;
  existingSlug?: string;
  timestamp: number;
  ip: string;
  yamlStub: string;
}

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const KV_NAMESPACE_ID = process.env.CLOUDFLARE_KV_NAMESPACE_ID;

if (!ACCOUNT_ID || !API_TOKEN || !KV_NAMESPACE_ID) {
  console.error('Error: Missing required environment variables');
  console.error('Required:');
  console.error('  CLOUDFLARE_ACCOUNT_ID');
  console.error('  CLOUDFLARE_API_TOKEN');
  console.error('  CLOUDFLARE_KV_NAMESPACE_ID');
  process.exit(1);
}

const exportDir = process.argv.includes('--export') 
  ? process.argv[process.argv.indexOf('--export') + 1] 
  : null;

async function listSubmissions(): Promise<void> {
  try {
    console.log('Fetching submissions from Cloudflare KV...\n');

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE_ID}/keys?prefix=submission:`,
      {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch submissions: ${error}`);
    }

    const data = await response.json() as { result: Array<{ name: string }> };
    const keys = data.result;

    if (keys.length === 0) {
      console.log('No submissions found.');
      return;
    }

    console.log(`Found ${keys.length} submission(s)\n`);

    const submissions: Submission[] = [];

    for (const key of keys) {
      const valueResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE_ID}/values/${key.name}`,
        {
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
          },
        }
      );

      if (valueResponse.ok) {
        const submission = await valueResponse.json() as Submission;
        submissions.push(submission);
      }
    }

    submissions.sort((a, b) => b.timestamp - a.timestamp);

    for (const submission of submissions) {
      const date = new Date(submission.timestamp).toISOString();
      console.log(`ID: ${submission.id}`);
      console.log(`Date: ${date}`);
      console.log(`Tool: ${submission.toolName}`);
      console.log(`URL: ${submission.url}`);
      console.log(`Category: ${submission.category}`);
      console.log(`Pricing: ${submission.pricing}`);
      console.log(`Email: ${submission.email}`);
      console.log(`Is Maintainer: ${submission.isMaintainer}`);
      console.log(`Mode: ${submission.mode || 'add'}`);
      if (submission.existingSlug) {
        console.log(`Existing Slug: ${submission.existingSlug}`);
      }
      console.log('---\n');
    }

    if (exportDir) {
      mkdirSync(exportDir, { recursive: true });

      for (const submission of submissions) {
        const slug = submission.toolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const filename = `${slug}-${submission.id.substring(0, 8)}.yaml`;
        const filepath = join(exportDir, filename);

        writeFileSync(filepath, submission.yamlStub);
        console.log(`Exported: ${filename}`);
      }

      console.log(`\n${submissions.length} YAML stub(s) exported to ${exportDir}`);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listSubmissions();
