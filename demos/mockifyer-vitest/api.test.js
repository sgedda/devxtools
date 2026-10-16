import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupMockifyer, getCurrentDate } from '@sgedda/mockifyer-fetch';

// Store original fetch
const originalFetch = globalThis.fetch;

beforeAll(() => {
  setupMockifyer({
    mockDataPath: './mock-data',
    defaultScenario: 'default',
    recordMode: false,
    useGlobalFetch: true,
    domainPathRulesMode: 'record_all',
    failOnMissingMock: true, // Throw if mock is missing
    dateManipulation: {
      fixedDate: '2026-10-16T21:41:00.000Z',
    },
  });
});

afterAll(() => {
  // Restore original fetch after tests
  globalThis.fetch = originalFetch;
});

describe('Mockifyer replay tests', () => {
  it('replays recorded HTTP response from mock file', async () => {
    const response = await fetch('https://demo.devxtools.dev/tasks/1');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data).toEqual({
      id: 1,
      title: 'Set up project repository',
      completed: true,
      userId: 1,
    });
  });

  it('replays via Mockifyer wrapped fetch', async () => {
    // Mockifyer keeps its own reference to the original fetch,
    // so it intercepts before any later wrapper we add
    const mockifyerWrappedFetch = globalThis.fetch;
    
    const response = await mockifyerWrappedFetch('https://demo.devxtools.dev/tasks/1');
    const data = await response.json();
    
    expect(data.title).toBe('Set up project repository');
  });

  it('returns fixed date from getCurrentDate', () => {
    const currentDate = getCurrentDate();
    expect(currentDate.toISOString()).toBe('2026-10-16T21:41:00.000Z');
  });
});
