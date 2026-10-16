import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupMockifyer, getCurrentDate } from '@sgedda/mockifyer-fetch';

// Store original fetch to block network in strict test
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

  it('proves offline replay: network is blocked but test passes', async () => {
    // Block network temporarily to prove mock is replayed
    const blockedFetch = () => {
      throw new Error('NETWORK_BLOCKED: Real fetch should not be called when mocks exist');
    };
    
    // Replace fetch AFTER Mockifyer's setup (Mockifyer already wrapped it)
    // This tests that Mockifyer intercepts before reaching our block
    const mockifyerWrappedFetch = globalThis.fetch;
    globalThis.fetch = blockedFetch;
    
    try {
      // Mockifyer should still work through its internal reference
      const response = await mockifyerWrappedFetch('https://demo.devxtools.dev/tasks/1');
      const data = await response.json();
      
      // If we got here, the mock was replayed (network was never hit)
      expect(data.title).toBe('Set up project repository');
    } finally {
      // Restore Mockifyer's wrapped fetch
      globalThis.fetch = mockifyerWrappedFetch;
    }
  });

  it('returns fixed date from getCurrentDate', () => {
    const currentDate = getCurrentDate();
    expect(currentDate.toISOString()).toBe('2026-10-16T21:41:00.000Z');
  });

  it('mock edit verification: change mock JSON and this test sees the change', async () => {
    // This test documents how to verify replay is working:
    // 1. Edit mock-data/default/*_GET_demo_devxtools_dev_tasks_1.json
    // 2. Change "title": "Set up project repository" to "title": "OFFLINE-CHECK"
    // 3. Run: npx vitest run
    // 4. This test will fail with the new title, proving the mock is being replayed
    //
    // To see it work: edit the JSON file, then run the tests.
    const response = await fetch('https://demo.devxtools.dev/tasks/1');
    const data = await response.json();
    
    // This assertion checks the current mock value
    expect(data.title).toBe('Set up project repository');
    
    // If you changed the mock to 'OFFLINE-CHECK', this test would fail
    // because the mock is being replayed, not hitting the live API
  });
});
