import { describe, it, expect } from 'vitest';
import worker from './index';

const createTestEnv = (): any => {
  const votes = new Map<string, { poll_id: string; option_id: string; voter_hash: string; created_at: string; id: number }>();
  let nextId = 1;

  const db: any = {
    prepare: (sql: string) => {
      const boundArgs: any[] = [];
      const prepared = {
        bind: (...args: any[]) => {
          boundArgs.push(...args);
          return prepared;
        },
        first: async () => null,
        all: async () => {
          if (sql.includes('SELECT * FROM votes WHERE created_at')) {
            const timestamp = boundArgs[0];
            const results = Array.from(votes.values()).filter(v => v.created_at === timestamp);
            return { results };
          }
          return { results: [] };
        },
        run: async () => {
          if (sql.includes('CREATE TABLE')) {
            return { success: true, meta: { changes: 0 } };
          }
          if (sql.includes('INSERT INTO votes')) {
            const id = nextId++;
            const vote = {
              id,
              poll_id: boundArgs[0],
              option_id: boundArgs[1],
              voter_hash: boundArgs[2],
              created_at: boundArgs[3],
            };
            votes.set(`${id}`, vote);
            return { success: true, meta: { changes: 1 } };
          }
          if (sql.includes('UPDATE votes SET voter_hash')) {
            const cutoffDate = boundArgs[0];
            let changes = 0;
            for (const [key, vote] of votes.entries()) {
              if (vote.created_at < cutoffDate && !vote.voter_hash.startsWith('EXPIRED_')) {
                vote.voter_hash = `EXPIRED_${vote.id}_${vote.poll_id}_${vote.option_id}_${vote.created_at}`;
                changes++;
              }
            }
            return { success: true, meta: { changes } };
          }
          return { success: true, meta: { changes: 0 } };
        },
      };
      return prepared;
    },
    exec: async () => {},
    batch: async () => [],
  };

  return {
    DB: db,
    VOTE_SALT: 'test-salt',
    RATE_LIMITER: {
      limit: async () => ({ success: true }),
    },
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

  it('should reject POST vote when RATE_LIMITER binding is missing', async () => {
    const env: any = {
      ...createTestEnv(),
      RATE_LIMITER: undefined,
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

  it('should allow GET request when RATE_LIMITER binding is missing', async () => {
    const env: any = {
      ...createTestEnv(),
      RATE_LIMITER: undefined,
    };

    const request = new Request('https://devxtools.dev/api/polls/test', {
      headers: { 'CF-Connecting-IP': '192.168.1.1' },
    });

    const response = await worker.fetch(request, env);

    // Should pass through to the handler (which returns 404 for unknown poll)
    // The key is that it doesn't return 429 or block the request
    expect(response.status).not.toBe(429);
  });

  it('should enforce in-memory burst protection for rapid POST votes', async () => {
    const env = createTestEnv();
    
    // Override DB to return a valid poll and option
    env.DB.prepare = (sql: string) => {
      const boundArgs: any[] = [];
      const prepared = {
        bind: (...args: any[]) => {
          boundArgs.push(...args);
          return prepared;
        },
        first: async () => {
          if (sql.includes('SELECT * FROM polls')) {
            return { id: 1, slug: 'test', question: 'Test?', status: 'active' };
          }
          if (sql.includes('SELECT * FROM options')) {
            return { id: 1, poll_id: 1, slug: 'option-1', label: 'Option 1', tool_slug: null, sort: 1 };
          }
          return null;
        },
        all: async () => ({ results: [] }),
        run: async () => ({ success: true, meta: { changes: 1 } }),
      };
      return prepared;
    };

    const makeRequest = () => new Request('https://devxtools.dev/api/polls/test/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '192.168.1.100',
      },
      body: JSON.stringify({ option: 'option-1' }),
    });

    // First 5 attempts should succeed (rate limit allows them)
    for (let i = 0; i < 5; i++) {
      const response = await worker.fetch(makeRequest(), env);
      expect(response.status).not.toBe(429);
    }

    // 6th attempt within the same minute should be rate limited by burst protection
    const response = await worker.fetch(makeRequest(), env);
    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data).toHaveProperty('code', 'RATE_LIMITED');
  });

  it('should anonymize old votes without UNIQUE constraint violations', async () => {
    const env = createTestEnv();

    await env.DB.prepare(
      'CREATE TABLE IF NOT EXISTS votes (id INTEGER PRIMARY KEY AUTOINCREMENT, poll_id TEXT, option_id TEXT, voter_hash TEXT, created_at TEXT, UNIQUE(poll_id, voter_hash))'
    ).run();

    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 91);
    const oldTimestamp = oldDate.toISOString().replace('T', ' ').substring(0, 19);

    await env.DB.prepare(
      'INSERT INTO votes (poll_id, option_id, voter_hash, created_at) VALUES (?, ?, ?, ?)'
    ).bind('test-poll', 'option-1', 'hash1', oldTimestamp).run();

    await env.DB.prepare(
      'INSERT INTO votes (poll_id, option_id, voter_hash, created_at) VALUES (?, ?, ?, ?)'
    ).bind('test-poll', 'option-1', 'hash2', oldTimestamp).run();

    await worker.scheduled({ scheduledTime: Date.now(), cron: '0 2 * * *' } as any, env);

    const votes = await env.DB.prepare('SELECT * FROM votes WHERE created_at = ?').bind(oldTimestamp).all();
    
    expect(votes.results?.length).toBe(2);
    expect(votes.results?.[0].voter_hash).toMatch(/^EXPIRED_/);
    expect(votes.results?.[1].voter_hash).toMatch(/^EXPIRED_/);
    expect(votes.results?.[0].voter_hash).not.toBe(votes.results?.[1].voter_hash);
  });
});
