import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getAllTools, getToolsBySection } from '../lib/tools';
import { SECTION_LABELS } from '../lib/schema';

export const GET: APIRoute = async () => {
  const tools = getAllTools();
  const sections = Object.keys(SECTION_LABELS);
  const articles = await getCollection('articles');

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

  content += `## About\n\n`;
  content += `- **About DevX Tools**: Learn about our mission to help developers find the right API development and testing tools\n`;
  content += `  https://devxtools.dev/about/\n\n`;

  content += `## Submit\n\n`;
  content += `- **Submit a Tool**: Add your API development, testing, or mocking tool to our catalog\n`;
  content += `  https://devxtools.dev/submit/\n\n`;

  const comparisonArticles = articles.filter(a => a.data.slug.startsWith('/comparisons/'));
  const guideArticles = articles.filter(a => a.data.slug.startsWith('/guides/'));
  const testingArticles = articles.filter(a => a.data.slug.startsWith('/testing/'));
  const observabilityArticles = articles.filter(a => a.data.slug.startsWith('/observability/'));

  content += `## Comparisons\n\n`;
  content += `- **MSW vs Nock**: The two most popular HTTP mocking libraries for JavaScript compared head-to-head\n`;
  content += `  https://devxtools.dev/comparisons/msw-vs-nock/\n\n`;
  content += `- **MSW vs Nock vs Polly.js**: Three-way comparison including Polly.js for record/replay workflows\n`;
  content += `  https://devxtools.dev/comparisons/msw-vs-nock-vs-polly/\n\n`;
  content += `- **Bruno vs Postman**: Compare accounts, CI runners, reports, mock servers, security and pricing in 2026\n`;
  content += `  https://devxtools.dev/comparisons/bruno-vs-postman/\n\n`;
  content += `- **Playwright vs Cypress**: Architecture, network mocking, MSW, CI cost, debugging, and component tests\n`;
  content += `  https://devxtools.dev/comparisons/playwright-vs-cypress/\n\n`;
  comparisonArticles.forEach((article) => {
    content += `- **${article.data.title}**: ${article.data.description}\n`;
    content += `  https://devxtools.dev${article.data.slug}\n\n`;
  });

  content += `## Guides\n\n`;
  content += `- **MSW vs Nock vs Polly.js**: Compare three popular JavaScript HTTP mocking libraries and find the right fit for your project\n`;
  content += `  https://devxtools.dev/guides/msw-vs-nock-vs-polly/\n\n`;
  content += `- **Mocking APIs in Playwright**: Intercept, mock, and test API calls in Playwright tests with page.route and MSW\n`;
  content += `  https://devxtools.dev/guides/mock-api-playwright/\n\n`;
  guideArticles.forEach((article) => {
    content += `- **${article.data.title}**: ${article.data.description}\n`;
    content += `  https://devxtools.dev${article.data.slug}\n\n`;
  });

  if (testingArticles.length > 0) {
    content += `## Testing\n\n`;
    testingArticles.forEach((article) => {
      content += `- **${article.data.title}**: ${article.data.description}\n`;
      content += `  https://devxtools.dev${article.data.slug}\n\n`;
    });
  }

  if (observabilityArticles.length > 0) {
    content += `## Observability\n\n`;
    observabilityArticles.forEach((article) => {
      content += `- **${article.data.title}**: ${article.data.description}\n`;
      content += `  https://devxtools.dev${article.data.slug}\n\n`;
    });
  }

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
