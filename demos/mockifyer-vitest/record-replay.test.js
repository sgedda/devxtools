import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { setupMockifyer } from '@sgedda/mockifyer-fetch';

const originalFetch = globalThis.fetch;
const DEMO_URL = 'https://demo.devxtools.dev/tasks/1';

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('record then replay', () => {
  it('records a live demo API response and then serves the next call from the mock file', async () => {
    const mockDataPath = mkdtempSync(join(tmpdir(), 'mockifyer-record-replay-'));

    try {
      // Confirmed in @sgedda/mockifyer-core 1.10.190 ENV_VARS / README:
      // bodies are not stored unless MOCKIFYER_RECORD_RESPONSES is true (or recordResponses: true);
      // new recordings default to alwaysUseRealApi unless MOCKIFYER_RECORD_DEFAULT_ALWAYS_USE_REAL_API=false.
      process.env.MOCKIFYER_RECORD_RESPONSES = 'true';
      process.env.MOCKIFYER_RECORD_DEFAULT_ALWAYS_USE_REAL_API = 'false';

      setupMockifyer({
        mockDataPath,
        defaultScenario: 'default',
        recordMode: true,
        useGlobalFetch: true,
        domainPathRulesMode: 'record_all',
        recordResponses: true,
      });

      const recordStarted = performance.now();
      const liveResponse = await fetch(DEMO_URL);
      const recordedMs = performance.now() - recordStarted;
      const liveData = await liveResponse.json();

      expect(liveResponse.ok).toBe(true);
      expect(liveData).toEqual({
        id: 1,
        title: 'Set up project repository',
        completed: true,
        userId: 1,
      });

      // Wait for Mockifyer to finish writing the mock file to disk
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockFiles = [];
      const walk = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const full = join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (entry.name.endsWith('.json') && entry.name !== 'domain-path-rules.json') {
            mockFiles.push(full);
          }
        }
      };
      walk(mockDataPath);
      const taskMocks = mockFiles.filter((path) => path.includes('tasks/1') || path.includes('tasks_1'));
      expect(taskMocks.length).toBeGreaterThan(0);
      const mockPath = taskMocks.sort().at(-1);
      const saved = JSON.parse(readFileSync(mockPath, 'utf8'));
      expect(saved.response?.data).toEqual(liveData);

      // Offline proof: if the second call used the live API, this edited title would not come back.
      saved.response.data = { ...saved.response.data, title: 'REPLAYED-FROM-MOCK' };
      writeFileSync(mockPath, JSON.stringify(saved, null, 2));

      globalThis.fetch = originalFetch;
      setupMockifyer({
        mockDataPath,
        defaultScenario: 'default',
        recordMode: false,
        useGlobalFetch: true,
        domainPathRulesMode: 'record_all',
        failOnMissingMock: true,
      });

      const replayStarted = performance.now();
      const replayResponse = await fetch(DEMO_URL);
      const replayedMs = performance.now() - replayStarted;
      const replayData = await replayResponse.json();

      expect(replayData.title).toBe('REPLAYED-FROM-MOCK');
      // Written to the test report so a StackBlitz or CI run shows record vs replay clearly.
      console.log(
        `recorded from live API in ${recordedMs.toFixed(1)}ms; replayed from ${mockPath} in ${replayedMs.toFixed(1)}ms`,
      );
    } finally {
      rmSync(mockDataPath, { recursive: true, force: true });
      globalThis.fetch = originalFetch;
    }
  }, 20_000);
});
