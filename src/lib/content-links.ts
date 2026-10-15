export interface ContentLink {
  title: string;
  url: string;
  type: 'comparison' | 'guide';
}

const comparisons: Array<{ title: string; url: string; tools: string[] }> = [
  {
    title: "MSW vs Nock",
    url: "/comparisons/msw-vs-nock/",
    tools: ["msw", "nock"]
  },
  {
    title: "MSW vs Nock vs Polly.js",
    url: "/comparisons/msw-vs-nock-vs-polly/",
    tools: ["msw", "nock", "pollyjs"]
  }
];

const guides: Array<{ title: string; url: string; tools: string[] }> = [
  {
    title: "MSW vs Nock vs Polly.js",
    url: "/guides/msw-vs-nock-vs-polly/",
    tools: ["msw", "nock", "pollyjs"]
  },
  {
    title: "Spec-First Mocking with Prism and OpenAPI",
    url: "/guides/openapi-mock-server-prism/",
    tools: ["prism"]
  },
  {
    title: "Mocking APIs in React Native with Mockifyer",
    url: "/guides/mock-api-react-native/",
    tools: ["mockifyer"]
  },
  {
    title: "Realistic Test Data with Faker and Factories",
    url: "/guides/faker-js-test-data-factories/",
    tools: ["faker", "fishery"]
  },
  {
    title: "Keeping Mocks Honest with Pact",
    url: "/guides/pact-contract-testing-javascript/",
    tools: ["pact"]
  }
];

export function getToolContentLinks(toolSlug: string): { comparisons: ContentLink[]; guides: ContentLink[] } {
  const toolComparisons = comparisons
    .filter(comp => comp.tools.includes(toolSlug))
    .map(comp => ({
      title: comp.title,
      url: comp.url,
      type: 'comparison' as const
    }));

  const toolGuides = guides
    .filter(guide => guide.tools.includes(toolSlug))
    .map(guide => ({
      title: guide.title,
      url: guide.url,
      type: 'guide' as const
    }));

  return {
    comparisons: toolComparisons,
    guides: toolGuides
  };
}
