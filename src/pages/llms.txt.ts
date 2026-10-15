import type { APIRoute } from 'astro';
import { getAllTools, getToolsBySection } from '../lib/tools';
import { SECTION_LABELS } from '../lib/schema';

export const GET: APIRoute = () => {
  const tools = getAllTools();
  const sections = Object.keys(SECTION_LABELS);

  let content = `# DevX Tools - llms.txt\n\n`;
  content += `> A comprehensive catalog of API development, testing, and mocking tools\n\n`;

  content += `## Hubs\n\n`;
  sections.forEach((section) => {
    const sectionLabel = SECTION_LABELS[section as keyof typeof SECTION_LABELS];
    const sectionTools = getToolsBySection(section);
    const toolCount = sectionTools.length;
    content += `- **${sectionLabel}** (${toolCount} tools): Browse ${sectionLabel.toLowerCase()} tools for modern development workflows\n`;
    content += `  https://devxtools.dev/${section}/\n\n`;
  });

  content += `## Catalog\n\n`;
  content += `- **Tool Catalog**: Explore all ${tools.length} tools for API development, testing, mocking, and test data generation\n`;
  content += `  https://devxtools.dev/catalog/\n\n`;

  content += `## Comparisons\n\n`;
  content += `- **MSW vs Nock**: The two most popular HTTP mocking libraries for JavaScript compared head-to-head\n`;
  content += `  https://devxtools.dev/comparisons/msw-vs-nock/\n\n`;
  content += `- **MSW vs Nock vs Polly.js**: Three-way comparison including Polly.js for record/replay workflows\n`;
  content += `  https://devxtools.dev/comparisons/msw-vs-nock-vs-polly/\n\n`;

  content += `## Guides\n\n`;
  content += `- **MSW vs Nock vs Polly.js**: Compare three popular JavaScript HTTP mocking libraries and find the right fit for your project\n`;
  content += `  https://devxtools.dev/guides/msw-vs-nock-vs-polly/\n\n`;
  content += `- **Spec-First Mocking with Prism and OpenAPI**: Generate mock servers directly from your OpenAPI specifications using Prism\n`;
  content += `  https://devxtools.dev/guides/spec-first-mocking-prism-openapi/\n\n`;
  content += `- **Mocking APIs in React Native**: Compare MSW, MirageJS, and Mockifyer for mocking HTTP requests in React Native applications\n`;
  content += `  https://devxtools.dev/guides/react-native-mocking-mockifyer/\n\n`;
  content += `- **Realistic Test Data with Faker and Factories**: Create maintainable, realistic test data using Faker and factory patterns with Fishery\n`;
  content += `  https://devxtools.dev/guides/realistic-test-data-faker-factories/\n\n`;
  content += `- **Keeping Mocks Honest with Pact**: Use consumer-driven contract testing to ensure your mocks stay in sync with real APIs\n`;
  content += `  https://devxtools.dev/guides/keeping-mocks-honest-pact/\n\n`;

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
