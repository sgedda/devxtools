/**
 * Stack Picker filtering and ranking logic
 * Shared between the picker page and tests
 */

export interface PickerState {
  platform: string;
  need: string[];
  lang: string;
  spec: string[];
  oss: string;
}

export interface Tool {
  name: string;
  slug: string;
  githubStars?: number;
  isOpenSource: boolean;
  languageAgnostic?: boolean;
  languages?: string[];
  runtimes?: string[];
  platforms?: string[];
  categories?: string[];
  specSupport?: string[];
  bestFor?: string;
  whenToUse?: string;
  affiliation?: string;
  [key: string]: any;
}

export interface ToolMatch {
  tool: Tool;
  reasons: string[];
  score: number;
  isLanguageAgnostic: boolean;
}

export const NEED_TO_CATEGORIES: Record<string, string[]> = {
  mock: ['http-interception', 'mock-server', 'spec-based-mocking', 'hosted-mocks'],
  record: ['record-replay'],
  data: ['test-data-generation'],
  e2e: ['e2e-testing'],
  contract: ['contract-testing', 'openapi-tooling', 'sdk-generator'],
  load: ['load-testing'],
  debug: ['api-client', 'network-debugging'],
  observe: ['error-monitoring', 'distributed-tracing', 'log-aggregation', 'application-logging', 'metrics']
};

export const NEED_LABELS: Record<string, string> = {
  mock: 'Mock APIs in tests',
  record: 'Record & replay',
  data: 'Test data',
  e2e: 'E2E / UI tests',
  contract: 'Contract / spec',
  load: 'Load testing',
  debug: 'Explore / debug APIs',
  observe: 'Monitor in production'
};

export function matchesTool(
  tool: Tool,
  state: PickerState,
  filterMode: 'best' | 'also' = 'best'
): ToolMatch | null {
  const reasons: string[] = [];
  let score = 0;
  let isLanguageAgnostic = false;
  
  // Platform matching
  if (state.platform) {
    const platformMatches: Record<string, boolean> = {
      web: tool.runtimes?.some(r => ['Browser', 'Web', 'React'].includes(r)) || tool.platforms?.includes('Web'),
      rn: tool.runtimes?.some(r => r === 'React Native') || tool.platforms?.includes('React Native') || tool.platforms?.includes('iOS') || tool.platforms?.includes('Android'),
      node: tool.runtimes?.some(r => r === 'Node.js'),
      backend: tool.runtimes?.some(r => ['JVM', 'Python', '.NET'].includes(r)) || tool.languages?.some(l => ['Java', 'Python', 'Go', 'C#', '.NET', 'Kotlin', 'Scala'].includes(l))
    };
    
    const agnosticPlatform = tool.languageAgnostic || tool.runtimes?.some(r => ['CLI', 'Desktop', 'Hosted', 'Docker', 'Self-hosted', 'Kubernetes', 'Multi-language'].includes(r));
    
    if (platformMatches[state.platform]) {
      reasons.push(state.platform);
      score += 10;
    } else if (agnosticPlatform && filterMode === 'also') {
      isLanguageAgnostic = true;
      reasons.push('language-agnostic');
    } else {
      return null; // Hard filter: no platform match
    }
  }
  
  // Needs matching
  let matchedNeeds: string[] = [];
  if (state.need.length > 0) {
    state.need.forEach(need => {
      const cats = NEED_TO_CATEGORIES[need] || [];
      if (tool.categories?.some(c => cats.includes(c))) {
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
      ts: tool.languages?.some(l => ['TypeScript', 'JavaScript'].includes(l)),
      py: tool.languages?.includes('Python'),
      jvm: tool.languages?.some(l => ['Java', 'Kotlin', 'Scala'].includes(l)),
      go: tool.languages?.includes('Go'),
      dotnet: tool.languages?.some(l => ['C#', '.NET'].includes(l)),
      ruby: tool.languages?.includes('Ruby')
    };
    
    const anyLanguage = tool.languages?.includes('N/A') || tool.languageAgnostic;
    
    if (langMatches[state.lang]) {
      reasons.push(state.lang);
      score += 5;
    } else if (anyLanguage && filterMode === 'also') {
      isLanguageAgnostic = true;
      reasons.push('any-language');
    } else {
      return null; // Hard filter: no language match
    }
  }
  
  // Spec support
  if (state.spec.length > 0) {
    const matchedSpecs = state.spec.filter(spec => 
      tool.specSupport?.some(s => s.toLowerCase() === spec.toLowerCase())
    );
    if (matchedSpecs.length === 0) {
      return null; // Hard filter: no spec match
    }
    matchedSpecs.forEach(spec => {
      reasons.push(spec);
      score += 3;
    });
  }
  
  // OSS filter
  if (state.oss === '1') {
    if (!tool.isOpenSource) {
      return null; // Hard filter: not OSS
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

export function rankTools(matches: ToolMatch[]): ToolMatch[] {
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

export function parseUrlState(): PickerState {
  if (typeof window === 'undefined') {
    return { platform: '', need: [], lang: '', spec: [], oss: '' };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    platform: params.get('platform') || '',
    need: params.get('need')?.split(',').filter(Boolean).slice(0, 3) || [],
    lang: params.get('lang') || '',
    spec: params.get('spec')?.split(',').filter(Boolean) || [],
    oss: params.get('oss') || ''
  };
}

export function serializeUrlState(state: PickerState): string {
  const params = new URLSearchParams();
  if (state.platform) params.set('platform', state.platform);
  if (state.need.length) params.set('need', state.need.join(','));
  if (state.lang) params.set('lang', state.lang);
  if (state.spec.length) params.set('spec', state.spec.join(','));
  if (state.oss) params.set('oss', state.oss);
  return params.toString();
}

export function getMostRestrictiveFilter(state: PickerState): string {
  // Determine which filter is most restrictive
  if (state.need.length > 0) return 'need';
  if (state.spec.length > 0) return 'spec';
  if (state.lang) return 'lang';
  if (state.platform) return 'platform';
  if (state.oss) return 'oss';
  return '';
}

export function findNearestMatches(tools: Tool[], state: PickerState, limit: number = 3): ToolMatch[] {
  // Try relaxing filters one at a time
  const relaxed = { ...state };
  const restrictive = getMostRestrictiveFilter(relaxed);
  
  // Relax the most restrictive filter
  if (restrictive === 'need') relaxed.need = [];
  else if (restrictive === 'spec') relaxed.spec = [];
  else if (restrictive === 'lang') relaxed.lang = '';
  else if (restrictive === 'platform') relaxed.platform = '';
  else if (restrictive === 'oss') relaxed.oss = '';
  
  const matches = tools
    .map(t => matchesTool(t, relaxed, 'best'))
    .filter((m): m is ToolMatch => m !== null);
  
  return rankTools(matches).slice(0, limit);
}
