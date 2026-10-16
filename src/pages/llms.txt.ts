import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { readdirSync } from 'fs';
import { join } from 'path';

interface PageInfo {
  url: string;
  title: string;
  description: string;
}

const staticPages: PageInfo[] = [
  { url: '/', title: 'DevX Tools', description: 'Find the right API development, testing, and mocking tools for your workflow' },
  { url: '/catalog/', title: 'Tool Catalog', description: 'Explore all tools for API development, testing, mocking, and test data generation' },
  { url: '/about/', title: 'About DevX Tools', description: 'Learn about our mission to help developers find the right API development and testing tools' },
  { url: '/submit/', title: 'Submit a Tool', description: 'Add your API development, testing, or mocking tool to our catalog' },
  { url: '/picker/', title: 'Tool Picker', description: 'Answer a few questions to find the perfect tool for your use case' },
  { url: '/polls/', title: 'Stack Polls', description: 'Vote for your stack and see what tools the community is using' },
  { url: '/polls/rn-api-mocking/', title: 'Poll: How do you mock APIs in React Native?', description: 'Vote for your preferred API mocking tool for React Native development' },
  { url: '/changelog/', title: 'Changelog', description: 'Recent additions and updates to the DevX Tools catalog' },
  { url: '/comparisons/', title: 'Tool Comparisons', description: 'Head-to-head comparisons of popular API development and testing tools' },
  { url: '/guides/', title: 'Guides', description: 'In-depth guides for API development, testing, and mocking' },
  { url: '/demos/', title: 'Live Demos', description: 'Run interactive demos of API mocking and testing tools directly in your browser via StackBlitz' },
  { url: '/blog/', title: 'Blog', description: 'Articles about developer tools, testing, and API development' },
  { url: '/mocking-test-data/', title: 'Mocking & Test Data', description: 'Browse mocking & test data tools for modern development workflows' },
  { url: '/api-development/', title: 'API Development', description: 'Browse API development tools for modern development workflows' },
  { url: '/api-development/postman-alternatives/', title: 'Postman Alternatives', description: 'Explore alternatives to Postman for API development and testing' },
  { url: '/testing/', title: 'Testing', description: 'Browse testing tools for modern development workflows' },
  { url: '/observability/', title: 'Observability & Logging', description: 'Browse observability & logging tools for modern development workflows' },
];

const astroComparisons: PageInfo[] = [
  { url: '/comparisons/msw-vs-nock/', title: 'MSW vs Nock', description: 'The two most popular HTTP mocking libraries for JavaScript compared head-to-head' },
  { url: '/comparisons/msw-vs-nock-vs-polly/', title: 'MSW vs Nock vs Polly.js', description: 'Three-way comparison including Polly.js for record/replay workflows' },
  { url: '/comparisons/bruno-vs-postman/', title: 'Bruno vs Postman', description: 'Compare accounts, CI runners, reports, mock servers, security and pricing in 2026' },
  { url: '/comparisons/playwright-vs-cypress/', title: 'Playwright vs Cypress', description: 'Architecture, network mocking, MSW, CI cost, debugging, and component tests' },
];

const astroGuides: PageInfo[] = [
  { url: '/guides/mock-api-playwright/', title: 'Mocking APIs in Playwright', description: 'Intercept, mock, and test API calls in Playwright tests with page.route and MSW' },
];

export const GET: APIRoute = async () => {
  const articles = await getCollection('articles');
  
  const pageMap = new Map<string, PageInfo>();
  
  staticPages.forEach(page => pageMap.set(page.url, page));
  astroComparisons.forEach(page => pageMap.set(page.url, page));
  astroGuides.forEach(page => pageMap.set(page.url, page));
  
  articles.forEach(article => {
    pageMap.set(article.data.slug, {
      url: article.data.slug,
      title: article.data.title,
      description: article.data.description
    });
  });

  const comparisonUrls = Array.from(pageMap.keys())
    .filter(url => url.startsWith('/comparisons/') && url !== '/comparisons/')
    .sort();
  
  const guideUrls = Array.from(pageMap.keys())
    .filter(url => url.startsWith('/guides/') && url !== '/guides/' && url !== '/guides/msw-vs-nock-vs-polly/')
    .sort();
  
  const testingUrls = Array.from(pageMap.keys())
    .filter(url => url.startsWith('/testing/') && url !== '/testing/')
    .sort();
  
  const observabilityUrls = Array.from(pageMap.keys())
    .filter(url => url.startsWith('/observability/') && url !== '/observability/')
    .sort();
  
  const blogUrls = Array.from(pageMap.keys())
    .filter(url => url.startsWith('/blog/') && url !== '/blog/')
    .sort();

  let content = `# DevX Tools - llms.txt\n\n`;
  content += `> A comprehensive catalog of API development, testing, and mocking tools\n\n`;

  const sections: Array<{ heading: string; urls: string[] }> = [
    { heading: 'Home', urls: ['/'] },
    { heading: 'Hubs', urls: ['/mocking-test-data/', '/api-development/', '/testing/', '/observability/'] },
    { heading: 'Catalog & Pickers', urls: ['/catalog/', '/picker/', '/demos/', '/api-development/postman-alternatives/'] },
    { heading: 'Polls', urls: ['/polls/', '/polls/rn-api-mocking/'] },
    { heading: 'About & Submit', urls: ['/about/', '/submit/', '/changelog/'] },
    { heading: 'Comparisons', urls: ['/comparisons/', ...comparisonUrls] },
    { heading: 'Guides', urls: ['/guides/', ...guideUrls] },
    { heading: 'Blog', urls: ['/blog/', ...blogUrls] },
    { heading: 'Testing', urls: testingUrls },
    { heading: 'Observability', urls: observabilityUrls },
  ];

  sections.forEach(({ heading, urls }) => {
    if (urls.length === 0) return;
    
    content += `## ${heading}\n\n`;
    
    urls.forEach(url => {
      const info = pageMap.get(url);
      if (info) {
        content += `- **${info.title}**: ${info.description}\n`;
        content += `  https://devxtools.dev${url}\n\n`;
      }
    });
  });

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
