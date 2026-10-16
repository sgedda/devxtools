import { z } from 'zod';

export const ToolSection = z.enum([
  'mocking-test-data',
  'api-development',
  'testing',
  'observability',
]);

export type ToolSection = z.infer<typeof ToolSection>;

export const ToolCategory = z.enum([
  'http-interception',
  'mock-server',
  'spec-based-mocking',
  'contract-testing',
  'test-data-generation',
  'hosted-mocks',
  'record-replay',
  'api-client',
  'openapi-tooling',
  'sdk-generator',
  'e2e-testing',
  'load-testing',
  'metrics',
  'error-monitoring',
  'distributed-tracing',
  'log-aggregation',
  'application-logging',
  'network-debugging',
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
  sections: z.array(ToolSection),
  categories: z.array(ToolCategory),
  specSupport: z.array(z.string()).optional(),
  platforms: z.array(z.enum(['iOS', 'Android', 'Web', 'React Native', 'Flutter'])).optional(),
  bestFor: z.string(),
  description: z.string(),
  whenToUse: z.string().optional(),
  githubStars: z.number().optional(),
  lastActivity: z.string().optional(), // ISO date string of last commit/release
  npmPackage: z.string().optional(), // npm package name for download stats
  pypiPackage: z.string().optional(), // PyPI package name for download stats
  weeklyDownloads: z.number().optional(), // weekly npm downloads
  lastChecked: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  affiliation: z.string().optional(), // Disclosure for affiliated tools
});

export type Tool = z.infer<typeof ToolSchema>;

export const SECTION_LABELS: Record<ToolSection, string> = {
  'mocking-test-data': 'Mocking & Test Data',
  'api-development': 'API Development',
  'testing': 'Testing',
  'observability': 'Observability & Logging',
};

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  'http-interception': 'HTTP Interception',
  'mock-server': 'Mock Server',
  'spec-based-mocking': 'Spec-Based Mocking',
  'contract-testing': 'Contract Testing',
  'test-data-generation': 'Test Data Generation',
  'hosted-mocks': 'Hosted Mocks',
  'record-replay': 'Record & Replay',
  'api-client': 'API Client',
  'openapi-tooling': 'OpenAPI Tooling',
  'sdk-generator': 'SDK Generator',
  'e2e-testing': 'E2E Testing',
  'load-testing': 'Load Testing',
  'metrics': 'Metrics',
  'error-monitoring': 'Error Monitoring',
  'distributed-tracing': 'Distributed Tracing',
  'log-aggregation': 'Log Aggregation',
  'application-logging': 'Application Logging',
  'network-debugging': 'Network Debugging',
};

export const SECTION_TO_CATEGORIES: Record<ToolSection, ToolCategory[]> = {
  'mocking-test-data': ['http-interception', 'mock-server', 'spec-based-mocking', 'contract-testing', 'test-data-generation', 'hosted-mocks', 'record-replay'],
  'api-development': ['api-client', 'openapi-tooling', 'sdk-generator'],
  'testing': ['e2e-testing', 'load-testing'],
  'observability': ['metrics', 'error-monitoring', 'distributed-tracing', 'log-aggregation', 'application-logging', 'network-debugging'],
};
