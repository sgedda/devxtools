import { z } from 'zod';

export const ToolCategory = z.enum([
  'http-interception',
  'mock-server',
  'spec-based-mocking',
  'contract-testing',
  'test-data-generation',
  'hosted-mocks',
  'record-replay',
]);

export type ToolCategory = z.infer<typeof ToolCategory>;

export const ToolSchema = z.object({
  name: z.string(),
  slug: z.string(),
  website: z.string().url(),
  repo: z.string().url().optional(),
  license: z.string().optional(),
  languages: z.array(z.string()),
  runtimes: z.array(z.string()),
  categories: z.array(ToolCategory),
  specSupport: z.array(z.string()).optional(),
  bestFor: z.string(),
  description: z.string(),
  lastChecked: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type Tool = z.infer<typeof ToolSchema>;

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  'http-interception': 'HTTP Interception',
  'mock-server': 'Mock Server',
  'spec-based-mocking': 'Spec-Based Mocking',
  'contract-testing': 'Contract Testing',
  'test-data-generation': 'Test Data Generation',
  'hosted-mocks': 'Hosted Mocks',
  'record-replay': 'Record & Replay',
};
