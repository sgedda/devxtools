import { describe, it, expect } from 'vitest';
import worker from './index';

const createTestEnv = (): any => {
  const db: any = {
    prepare: (sql: string) => ({
      bind: (...args: any[]) => ({
        first: async () => null,
        all: async () => ({ results: [] }),
        run: async () => ({ success: true, meta: { changes: 0 } }),
      }),
      first: async () => null,
      all: async () => ({ results: [] }),
      run: async () => ({ success: true, meta: { changes: 0 } }),
    }),
    exec: async () => {},
    batch: async () => [],
  };

  return {
    DB: db,
    VOTE_SALT: 'test-salt',
  };
};

describe('Votes Worker', () => {
  it('should handle GET request to unknown poll', async () => {
    const env = createTestEnv();
    const request = new Request('https://devxtools.dev/api/polls/nonexistent', {
      headers: { 'CF-Connecting-IP': '192.168.1.1' },
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('should reject GET request without IP address', async () => {
    const env = createTestEnv();
    const request = new Request('https://devxtools.dev/api/polls/test', {});

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('code', 'IP_REQUIRED');
  });

  it('should reject POST vote without IP address', async () => {
    const env = createTestEnv();
    const request = new Request('https://devxtools.dev/api/polls/test/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ option: 'test' }),
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('code', 'IP_REQUIRED');
  });

  it('should handle POST request with missing option', async () => {
    const env = createTestEnv();
    const request = new Request('https://devxtools.dev/api/polls/test/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '192.168.1.1',
      },
      body: JSON.stringify({}),
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('should handle invalid endpoint', async () => {
    const env = createTestEnv();
    const request = new Request('https://devxtools.dev/api/polls/invalid/path/here', {
      headers: { 'CF-Connecting-IP': '192.168.1.1' },
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(404);
  });

  it('should handle OPTIONS request with CORS', async () => {
    const env = createTestEnv();
    const request = new Request('https://devxtools.dev/api/polls/test', {
      method: 'OPTIONS',
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('should return 429 for rate limited GET request', async () => {
    const env: any = {
      ...createTestEnv(),
      RATE_LIMITER: {
        limit: async () => ({ success: false }),
      },
    };

    const request = new Request('https://devxtools.dev/api/polls/test', {
      headers: { 'CF-Connecting-IP': '192.168.1.1' },
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data).toHaveProperty('code', 'RATE_LIMITED');
  });

  it('should return 429 for rate limited POST request (fail closed)', async () => {
    const env: any = {
      ...createTestEnv(),
      RATE_LIMITER: {
        limit: async () => {
          throw new Error('Rate limiter error');
        },
      },
    };

    const request = new Request('https://devxtools.dev/api/polls/test/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '192.168.1.1',
      },
      body: JSON.stringify({ option: 'test' }),
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data).toHaveProperty('code', 'RATE_LIMITED');
  });

  it('should return 503 if VOTE_SALT is not configured', async () => {
    const env: any = {
      ...createTestEnv(),
      VOTE_SALT: undefined,
    };

    const request = new Request('https://devxtools.dev/api/polls/test', {
      headers: { 'CF-Connecting-IP': '192.168.1.1' },
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data).toHaveProperty('code', 'NOT_CONFIGURED');
  });
});
