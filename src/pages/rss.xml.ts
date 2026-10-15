import rss from '@astrojs/rss';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  // Define guides with metadata
  const guides = [
    {
      title: 'Spec-First Mocking with Prism and OpenAPI',
      description: 'Generate mock servers directly from your OpenAPI specifications using Prism.',
      link: '/guides/spec-first-mocking-prism-openapi/',
      pubDate: new Date('2026-10-14'),
    },
    {
      title: 'Keeping Mocks Honest with Pact',
      description: 'Use contract testing with Pact to ensure your mocks stay in sync with real APIs.',
      link: '/guides/keeping-mocks-honest-pact/',
      pubDate: new Date('2026-10-14'),
    },
    {
      title: 'React Native Mocking with Mockifyer',
      description: 'Record and replay HTTP traffic in React Native apps using Mockifyer.',
      link: '/guides/react-native-mocking-mockifyer/',
      pubDate: new Date('2026-10-14'),
    },
    {
      title: 'Realistic Test Data with Faker and Factories',
      description: 'Create maintainable, realistic test data using Faker and factory patterns with Fishery.',
      link: '/guides/realistic-test-data-faker-factories/',
      pubDate: new Date('2026-10-14'),
    },
    {
      title: 'MSW vs Nock vs Polly.js',
      description: 'Compare three popular HTTP mocking approaches for JavaScript testing.',
      link: '/guides/msw-vs-nock-vs-polly/',
      pubDate: new Date('2026-10-14'),
    },
  ];

  // Define comparisons with metadata
  const comparisons = [
    {
      title: 'MSW vs Nock (2026): Differences, Code & When to Use Each',
      description: 'Compare MSW and Nock, the two most popular HTTP mocking libraries for JavaScript and TypeScript.',
      link: '/comparisons/msw-vs-nock/',
      pubDate: new Date('2026-10-14'),
    },
    {
      title: 'MSW vs Nock vs Polly.js (2026): Which API Mocking Library?',
      description: 'Compare MSW, Nock, and Polly.js for HTTP mocking in JavaScript and TypeScript projects.',
      link: '/comparisons/msw-vs-nock-vs-polly/',
      pubDate: new Date('2026-10-14'),
    },
  ];

  const items = [...guides, ...comparisons].map(item => ({
    title: item.title,
    description: item.description,
    link: item.link,
    pubDate: item.pubDate,
  }));

  return rss({
    title: 'DevX Tools',
    description: "The developer's guide to API mocking, testing, and test data generation tools",
    site: context.site?.toString() || 'https://devxtools.dev',
    items,
    customData: '<language>en-us</language>',
  });
}
