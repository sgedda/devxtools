import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { readdirSync, readFileSync } from 'fs';
import { getAllTools } from '../lib/tools';
import { SECTION_LABELS } from '../lib/schema';
import { join } from 'path';

interface PageInfo {
  url: string;
  title: string;
  description: string;
}

const staticPages: PageInfo[] = [
  { url: '/', title: 'DevXTools', description: 'Find the right API development, testing, and mocking tools for your workflow' },
  { url: '/catalog/', title: 'Tool Catalog', description: 'Explore all tools for API development, testing, mocking, and test data generation' },
  { url: '/about/', title: 'About DevXTools', description: 'Learn about our mission to help developers find the right API development and testing tools' },
  { url: '/submit/', title: 'Submit a Tool', description: 'Add your API development, testing, or mocking tool to our catalog' },
  { url: '/picker/', title: 'Tool Picker', description: 'Answer a few questions to find the perfect tool for your use case' },
  { url: '/polls/', title: 'Stack Polls', description: 'Vote for your stack and see what tools the community is using' },
  { url: '/polls/rn-api-mocking/', title: 'Poll: How do you mock APIs in React Native?', description: 'Vote for your preferred API mocking tool for React Native development' },
  { url: '/contact/', title: 'Contact', description: 'Contact the editor: questions, tool corrections, listing claims, sponsorship and press' },
  { url: '/changelog/', title: 'Changelog', description: 'Recent additions and updates to the DevXTools catalog' },
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

// Hand-written .astro article pages: title/description are read from the page's own
// <Layout title=… description=…> props so llms.txt stays in sync with the live meta.
const astroArticlePages = [
  '/comparisons/bruno-vs-postman/',
  '/comparisons/playwright-vs-cypress/',
  '/guides/mock-api-playwright/',
  '/api-development/postman-alternatives/',
];

function astroPageInfo(url: string): PageInfo | undefined {
  try {
    const src = readFileSync(join(process.cwd(), 'src/pages', `${url.replace(/^\/|\/$/g, '')}.astro`), 'utf-8');
    const title = src.match(/\btitle="([^"]+)"/)?.[1];
    const description = src.match(/\bdescription="([^"]+)"/)?.[1];
    return title && description ? { url, title, description } : undefined;
  } catch {
    return undefined;
  }
}

const firstSentence = (text: string) => (text.match(/^.*?[.!?](\s|$)/)?.[0] ?? text).trim();

export const GET: APIRoute = async () => {
  const articles = await getCollection('articles');
  
  const pageMap = new Map<string, PageInfo>();
  
  staticPages.forEach(page => pageMap.set(page.url, page));
  astroArticlePages.forEach(url => {
    const info = astroPageInfo(url);
    if (info) pageMap.set(url, info);
  });
  
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

  let content = `# DevXTools\n\n`;
  content += `> A neutral catalog of API development, testing, mocking and observability tools, with hands-on comparisons and guides.\n\n`;

  const sections: Array<{ heading: string; urls: string[] }> = [
    { heading: 'Home', urls: ['/'] },
    { heading: 'Hubs', urls: ['/mocking-test-data/', '/api-development/', '/testing/', '/observability/'] },
    { heading: 'Catalog & Pickers', urls: ['/catalog/', '/picker/', '/demos/', '/api-development/postman-alternatives/'] },
    { heading: 'Comparisons', urls: ['/comparisons/', ...comparisonUrls] },
    { heading: 'Guides', urls: ['/guides/', ...guideUrls] },
    { heading: 'Blog', urls: ['/blog/', ...blogUrls] },
    { heading: 'Testing', urls: testingUrls },
    { heading: 'Observability', urls: observabilityUrls },
  ];

  const link = (info: PageInfo) => `- [${info.title}](https://devxtools.dev${info.url}): ${info.description}\n`;

  sections.forEach(({ heading, urls }) => {
    const infos = urls.map(url => pageMap.get(url)).filter((i): i is PageInfo => !!i);
    if (infos.length === 0) return;
    content += `## ${heading}\n\n` + infos.map(link).join('') + '\n';
  });

  // Tool pages, one line each, grouped by their primary section.
  const tools = getAllTools();
  const bySection = new Map<string, typeof tools>();
  tools.forEach(tool => {
    const section = tool.sections[0];
    bySection.set(section, [...(bySection.get(section) ?? []), tool]);
  });
  content += `## Tools\n\n`;
  for (const [section, list] of bySection) {
    content += `### ${SECTION_LABELS[section as keyof typeof SECTION_LABELS] ?? section}\n\n`;
    content += list.map(t => link({ url: `/tools/${t.slug}/`, title: t.name, description: firstSentence(t.description) })).join('') + '\n';
  }

  // Low-priority pages (llmstxt.org: links under "Optional" can be skipped for shorter context).
  const optional = ['/polls/', '/polls/rn-api-mocking/', '/about/', '/submit/', '/contact/', '/changelog/']
    .map(url => pageMap.get(url)).filter((i): i is PageInfo => !!i);
  content += `## Optional\n\n` + optional.map(link).join('');

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
