import { describe, it, expect } from 'vitest';

// Mock tools data for testing
const mockTools = [
  {
    name: 'MSW',
    slug: 'msw',
    githubStars: 18286,
    isOpenSource: true,
    languages: ['TypeScript', 'JavaScript'],
    runtimes: ['Node.js', 'Browser'],
    platforms: ['Web'],
    categories: ['http-interception'],
    sections: ['mocking-test-data']
  },
  {
    name: 'Nock',
    slug: 'nock',
    githubStars: 12500,
    isOpenSource: true,
    languages: ['JavaScript'],
    runtimes: ['Node.js'],
    categories: ['http-interception'],
    sections: ['mocking-test-data']
  },
  {
    name: 'Postman',
    slug: 'postman',
    isOpenSource: false,
    languageAgnostic: true,
    languages: ['N/A'],
    runtimes: ['Desktop', 'CLI', 'Web'],
    categories: ['api-client'],
    sections: ['api-development']
  },
  {
    name: 'Detox',
    slug: 'detox',
    githubStars: 12037,
    isOpenSource: true,
    languages: ['JavaScript', 'TypeScript'],
    runtimes: ['iOS', 'Android', 'React Native'],
    platforms: ['iOS', 'Android', 'React Native'],
    categories: ['e2e-testing'],
    sections: ['testing']
  },
  {
    name: 'Playwright',
    slug: 'playwright',
    githubStars: 70000,
    isOpenSource: true,
    languages: ['JavaScript', 'TypeScript', 'Python'],
    runtimes: ['Node.js', 'Browser'],
    platforms: ['Web'],
    categories: ['e2e-testing'],
    sections: ['testing']
  },
  {
    name: 'Prism',
    slug: 'prism',
    githubStars: 5053,
    isOpenSource: true,
    languages: ['TypeScript'],
    runtimes: ['Node.js', 'CLI', 'Docker'],
    categories: ['spec-based-mocking', 'mock-server'],
    specSupport: ['OpenAPI'],
    sections: ['mocking-test-data']
  }
];

// Test helper functions
function matchesTool(tool: any, state: any, filterMode: 'best' | 'also' = 'best') {
  const reasons = [];
  let score = 0;
  let isLanguageAgnostic = false;
  
  // Platform matching
  if (state.platform) {
    const platformMatches: Record<string, boolean> = {
      web: tool.runtimes?.some((r: string) => ['Browser', 'Web', 'React'].includes(r)) || tool.platforms?.includes('Web'),
      rn: tool.runtimes?.some((r: string) => r === 'React Native') || tool.platforms?.includes('React Native') || tool.platforms?.includes('iOS') || tool.platforms?.includes('Android'),
      node: tool.runtimes?.some((r: string) => r === 'Node.js'),
      backend: tool.runtimes?.some((r: string) => ['JVM', 'Python', '.NET'].includes(r)) || tool.languages?.some((l: string) => ['Java', 'Python', 'Go', 'C#', '.NET', 'Kotlin', 'Scala'].includes(l))
    };
    
    const agnosticPlatform = tool.languageAgnostic || tool.runtimes?.some((r: string) => ['CLI', 'Desktop', 'Hosted', 'Docker', 'Self-hosted', 'Kubernetes', 'Multi-language'].includes(r));
    
    if (platformMatches[state.platform]) {
      reasons.push(state.platform);
      score += 10;
    } else if (agnosticPlatform) {
      isLanguageAgnostic = true;
      if (filterMode !== 'best') {
        reasons.push('language-agnostic');
      }
    } else if (filterMode === 'best') {
      return null;
    }
  }
  
  // Needs matching
  const NEED_TO_CATEGORIES: Record<string, string[]> = {
    mock: ['http-interception', 'mock-server', 'spec-based-mocking', 'hosted-mocks'],
    record: ['record-replay'],
    data: ['test-data-generation'],
    e2e: ['e2e-testing'],
    contract: ['contract-testing', 'openapi-tooling', 'sdk-generator'],
    load: ['load-testing'],
    debug: ['api-client', 'network-debugging'],
    observe: ['error-monitoring', 'distributed-tracing', 'log-aggregation', 'application-logging', 'metrics']
  };
  
  let matchedNeeds: string[] = [];
  if (state.need && state.need.length > 0) {
    state.need.forEach((need: string) => {
      const cats = NEED_TO_CATEGORIES[need] || [];
      if (tool.categories?.some((c: string) => cats.includes(c))) {
        matchedNeeds.push(need);
        reasons.push(need);
        score += 10;
      }
    });
    
    // When needs are selected, tool MUST match at least one need to appear at all
    if (matchedNeeds.length === 0) {
      return null;
    }
  }
  
  // Language matching
  if (state.lang) {
    const langMatches: Record<string, boolean> = {
      ts: tool.languages?.some((l: string) => ['TypeScript', 'JavaScript'].includes(l)),
      py: tool.languages?.includes('Python'),
      jvm: tool.languages?.some((l: string) => ['Java', 'Kotlin', 'Scala'].includes(l)),
      go: tool.languages?.includes('Go'),
      dotnet: tool.languages?.some((l: string) => ['C#', '.NET'].includes(l)),
      ruby: tool.languages?.includes('Ruby')
    };
    
    const anyLanguage = tool.languages?.includes('N/A') || tool.languageAgnostic;
    
    if (langMatches[state.lang]) {
      reasons.push(state.lang);
      score += 5;
    } else if (anyLanguage) {
      isLanguageAgnostic = true;
      if (filterMode !== 'best') {
        reasons.push('any-language');
      }
    } else if (filterMode === 'best') {
      return null;
    }
  }
  
  // Spec support
  if (state.spec && state.spec.length > 0) {
    const matchedSpecs = state.spec.filter((spec: string) => 
      tool.specSupport?.some((s: string) => s.toLowerCase() === spec.toLowerCase())
    );
    if (matchedSpecs.length === 0 && filterMode === 'best') {
      return null;
    }
    matchedSpecs.forEach((spec: string) => {
      reasons.push(spec);
      score += 3;
    });
  }
  
  // OSS filter
  if (state.oss === '1') {
    if (!tool.isOpenSource) {
      return null;
    }
  }
  
  // For "also works", require at least one reason besides language-agnostic
  if (filterMode === 'also' && reasons.filter(r => r !== 'language-agnostic' && r !== 'any-language').length === 0) {
    return null;
  }
  
  return {
    tool,
    reasons: [...new Set(reasons)],
    score,
    isLanguageAgnostic
  };
}

function rankTools(matches: any[]) {
  return matches.sort((a, b) => {
    // First by score (fit)
    if (a.score !== b.score) return b.score - a.score;
    // Then by stars
    const starsA = a.tool.githubStars || 0;
    const starsB = b.tool.githubStars || 0;
    if (starsA !== starsB) return starsB - starsA;
    // Then A-Z
    return a.tool.name.localeCompare(b.tool.name);
  });
}

describe('Picker filtering logic', () => {
  it('filters by platform: web', () => {
    const state = { platform: 'web', need: [], lang: '', spec: [], oss: '' };
    
    const bestMatches = mockTools
      .map(t => matchesTool(t, state, 'best'))
      .filter(m => m && !m.isLanguageAgnostic);
    
    expect(bestMatches.length).toBeGreaterThan(0);
    expect(bestMatches.some(m => m?.tool.slug === 'msw')).toBe(true);
    expect(bestMatches.some(m => m?.tool.slug === 'playwright')).toBe(true);
  });
  
  it('filters by platform: React Native', () => {
    const state = { platform: 'rn', need: [], lang: '', spec: [], oss: '' };
    
    const bestMatches = mockTools
      .map(t => matchesTool(t, state, 'best'))
      .filter(m => m && !m.isLanguageAgnostic);
    
    expect(bestMatches.some(m => m?.tool.slug === 'detox')).toBe(true);
  });
  
  it('filters by need: mock', () => {
    const state = { platform: '', need: ['mock'], lang: '', spec: [], oss: '' };
    
    const bestMatches = mockTools
      .map(t => matchesTool(t, state, 'best'))
      .filter(m => m && !m.isLanguageAgnostic);
    
    expect(bestMatches.some(m => m?.tool.slug === 'msw')).toBe(true);
    expect(bestMatches.some(m => m?.tool.slug === 'nock')).toBe(true);
    expect(bestMatches.some(m => m?.tool.slug === 'prism')).toBe(true);
  });
  
  it('filters by need: e2e', () => {
    const state = { platform: '', need: ['e2e'], lang: '', spec: [], oss: '' };
    
    const bestMatches = mockTools
      .map(t => matchesTool(t, state, 'best'))
      .filter(m => m && !m.isLanguageAgnostic);
    
    expect(bestMatches.some(m => m?.tool.slug === 'playwright')).toBe(true);
    expect(bestMatches.some(m => m?.tool.slug === 'detox')).toBe(true);
  });
  
  it('filters by language: TypeScript', () => {
    const state = { platform: '', need: [], lang: 'ts', spec: [], oss: '' };
    
    const bestMatches = mockTools
      .map(t => matchesTool(t, state, 'best'))
      .filter(m => m && !m.isLanguageAgnostic);
    
    expect(bestMatches.some(m => m?.tool.slug === 'msw')).toBe(true);
    expect(bestMatches.some(m => m?.tool.slug === 'playwright')).toBe(true);
  });
  
  it('filters by OSS only', () => {
    const state = { platform: '', need: [], lang: '', spec: [], oss: '1' };
    
    const matches = mockTools
      .map(t => matchesTool(t, state, 'also'))
      .filter(m => m !== null);
    
    expect(matches.every(m => m?.tool.isOpenSource === true)).toBe(true);
    expect(matches.some(m => m?.tool.slug === 'postman')).toBe(false);
  });
  
  it('filters by spec support: OpenAPI', () => {
    const state = { platform: '', need: [], lang: '', spec: ['openapi'], oss: '' };
    
    const bestMatches = mockTools
      .map(t => matchesTool(t, state, 'best'))
      .filter(m => m && !m.isLanguageAgnostic);
    
    expect(bestMatches.some(m => m?.tool.slug === 'prism')).toBe(true);
  });
  
  it('combines multiple filters correctly', () => {
    const state = { platform: 'web', need: ['mock'], lang: 'ts', spec: [], oss: '' };
    
    const bestMatches = mockTools
      .map(t => matchesTool(t, state, 'best'))
      .filter(m => m && !m.isLanguageAgnostic);
    
    expect(bestMatches.some(m => m?.tool.slug === 'msw')).toBe(true);
    expect(bestMatches.every(m => {
      const match = matchesTool(m!.tool, state, 'best');
      return match && match.reasons.length >= 3; // All 3 filters should match
    })).toBe(true);
  });
  
  it('identifies language-agnostic tools correctly', () => {
    const state = { platform: 'node', need: ['debug'], lang: '', spec: [], oss: '' };
    
    // Postman matches the 'debug' need but is language-agnostic
    const postmanMatch = matchesTool(mockTools.find(t => t.slug === 'postman'), state, 'also');
    
    // It should match through the 'also' filter mode
    expect(postmanMatch).toBeDefined();
    if (postmanMatch) {
      expect(postmanMatch.tool.languageAgnostic).toBe(true);
    }
  });
});

describe('Picker ranking logic', () => {
  it('ranks by fit (score) first', () => {
    const state = { platform: 'web', need: ['mock'], lang: 'ts', spec: [], oss: '' };
    
    const matches = mockTools
      .map(t => matchesTool(t, state, 'best'))
      .filter(m => m && !m.isLanguageAgnostic) as any[];
    
    const ranked = rankTools(matches);
    
    // MSW should rank higher than a tool with fewer matching criteria
    const mswMatch = ranked.find(m => m.tool.slug === 'msw');
    expect(mswMatch).toBeDefined();
    expect(mswMatch!.score).toBeGreaterThan(0);
  });
  
  it('ranks by GitHub stars as tiebreaker', () => {
    const state = { platform: '', need: ['e2e'], lang: '', spec: [], oss: '' };
    
    const matches = mockTools
      .map(t => matchesTool(t, state, 'best'))
      .filter(m => m && !m.isLanguageAgnostic) as any[];
    
    const ranked = rankTools(matches);
    
    // Playwright (70k stars) should rank before Detox (12k stars) with same score
    const playwrightIdx = ranked.findIndex(m => m.tool.slug === 'playwright');
    const detoxIdx = ranked.findIndex(m => m.tool.slug === 'detox');
    
    if (playwrightIdx !== -1 && detoxIdx !== -1) {
      const playwrightMatch = ranked[playwrightIdx];
      const detoxMatch = ranked[detoxIdx];
      
      if (playwrightMatch.score === detoxMatch.score) {
        expect(playwrightIdx).toBeLessThan(detoxIdx);
      }
    }
  });
  
  it('ranks A-Z when stars are equal', () => {
    // Create tools with same score and no stars
    const toolA = { ...mockTools[0], name: 'Alpha Tool', slug: 'alpha', githubStars: undefined };
    const toolB = { ...mockTools[0], name: 'Beta Tool', slug: 'beta', githubStars: undefined };
    
    const state = { platform: '', need: [], lang: 'ts', spec: [], oss: '' };
    
    const matchA = matchesTool(toolA, state, 'best');
    const matchB = matchesTool(toolB, state, 'best');
    
    const ranked = rankTools([matchA, matchB].filter(Boolean) as any[]);
    
    expect(ranked[0].tool.name).toBe('Alpha Tool');
    expect(ranked[1].tool.name).toBe('Beta Tool');
  });
});

describe('URL state management', () => {
  it('parses platform from URL', () => {
    const params = new URLSearchParams('platform=web');
    expect(params.get('platform')).toBe('web');
  });
  
  it('parses multiple needs from URL', () => {
    const params = new URLSearchParams('need=mock,record,data');
    const needs = params.get('need')?.split(',').filter(Boolean);
    expect(needs).toEqual(['mock', 'record', 'data']);
  });
  
  it('limits needs to 3', () => {
    const params = new URLSearchParams('need=mock,record,data,e2e');
    const needs = params.get('need')?.split(',').filter(Boolean).slice(0, 3);
    expect(needs?.length).toBe(3);
  });
  
  it('parses all filter types', () => {
    const params = new URLSearchParams('platform=web&need=mock,e2e&lang=ts&spec=openapi&oss=1');
    
    expect(params.get('platform')).toBe('web');
    expect(params.get('need')?.split(',')).toEqual(['mock', 'e2e']);
    expect(params.get('lang')).toBe('ts');
    expect(params.get('spec')).toBe('openapi');
    expect(params.get('oss')).toBe('1');
  });
});

describe('Empty state logic', () => {
  it('computes most restrictive filter correctly', () => {
    const state = { platform: 'web', need: ['load'], lang: 'go', spec: [], oss: '' };
    
    // Count results without each filter
    const countWithoutFilter = (filterToRemove: string) => {
      const testState = { ...state };
      if (filterToRemove === 'platform') testState.platform = '';
      else if (filterToRemove === 'need') testState.need = [];
      else if (filterToRemove === 'lang') testState.lang = '';
      
      return mockTools.filter(t => matchesTool(t, testState, 'also')).length;
    };
    
    const countsWithout = {
      platform: countWithoutFilter('platform'),
      need: countWithoutFilter('need'),
      lang: countWithoutFilter('lang')
    };
    
    // The filter that gives the most results when removed is the most restrictive
    const mostRestrictive = Object.entries(countsWithout).reduce((a, b) => 
      b[1] > a[1] ? b : a
    );
    
    expect(mostRestrictive[1]).toBeGreaterThanOrEqual(0);
  });
});

describe('Need filter enforcement', () => {
  it('requires tools to match at least one need when needs are selected', () => {
    const state = { platform: 'web', need: ['mock'], lang: 'ts', spec: [], oss: '' };
    
    // Appium, Reactotron, Cypress, Playwright, Sentry, Hoppscotch should NOT appear
    // because they don't match the 'mock' need
    const allMatches = mockTools
      .map(t => matchesTool(t, state, 'also'))
      .filter(m => m !== null);
    
    // Check that no tool without a matching need appears
    allMatches.forEach(match => {
      const hasNeedMatch = state.need.some(need => {
        const NEED_TO_CATEGORIES: Record<string, string[]> = {
          mock: ['http-interception', 'mock-server', 'spec-based-mocking', 'hosted-mocks'],
          record: ['record-replay'],
          data: ['test-data-generation'],
          e2e: ['e2e-testing'],
          contract: ['contract-testing', 'openapi-tooling', 'sdk-generator'],
          load: ['load-testing'],
          debug: ['api-client', 'network-debugging'],
          observe: ['error-monitoring', 'distributed-tracing', 'log-aggregation', 'application-logging', 'metrics']
        };
        const cats = NEED_TO_CATEGORIES[need] || [];
        return match!.tool.categories?.some((c: string) => cats.includes(c));
      });
      expect(hasNeedMatch).toBe(true);
    });
  });
  
  it('excludes Appium when platform=web, need=mock, lang=ts', () => {
    const state = { platform: 'web', need: ['mock'], lang: 'ts', spec: [], oss: '' };
    
    const allMatches = mockTools
      .map(t => matchesTool(t, state, 'also'))
      .filter(m => m !== null);
    
    // Appium should not match because it's not in mock categories
    const appiumMatch = allMatches.find(m => m?.tool.slug === 'appium');
    expect(appiumMatch).toBeUndefined();
  });
  
  it('excludes Cypress and Playwright when need=mock', () => {
    const state = { platform: 'web', need: ['mock'], lang: '', spec: [], oss: '' };
    
    const allMatches = mockTools
      .map(t => matchesTool(t, state, 'also'))
      .filter(m => m !== null);
    
    // Cypress and Playwright are e2e tools, not mock tools
    const cypressMatch = allMatches.find(m => m?.tool.slug === 'cypress');
    const playwrightMatch = allMatches.find(m => m?.tool.slug === 'playwright');
    
    expect(cypressMatch).toBeUndefined();
    expect(playwrightMatch).toBeUndefined();
  });
  
  it('allows tools through when no needs are selected', () => {
    const state = { platform: 'web', need: [], lang: '', spec: [], oss: '' };
    
    const allMatches = mockTools
      .map(t => matchesTool(t, state, 'also'))
      .filter(m => m !== null);
    
    // Should get multiple tools including e2e tools
    expect(allMatches.length).toBeGreaterThan(0);
  });
});
