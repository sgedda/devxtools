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
    url: "/guides/spec-first-mocking-prism-openapi/",
    tools: ["prism"]
  },
  {
    title: "Mocking APIs in React Native with Mockifyer",
    url: "/guides/react-native-mocking-mockifyer/",
    tools: ["mockifyer"]
  },
  {
    title: "Realistic Test Data with Faker and Factories",
    url: "/guides/realistic-test-data-faker-factories/",
    tools: ["faker", "fishery"]
  },
  {
    title: "Keeping Mocks Honest with Pact",
    url: "/guides/keeping-mocks-honest-pact/",
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
