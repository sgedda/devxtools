/**
 * Stack voting API for devxtools.dev
 * Privacy-first voting system with D1 database backend
 */

interface Env {
  DB: D1Database;
  RATE_LIMITER?: RateLimit;
  VOTE_SALT?: string;
}

interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface Poll {
  id: number;
  slug: string;
  question: string;
  status: string;
}

interface PollOption {
  id: number;
  poll_id: number;
  slug: string;
  label: string;
  tool_slug: string | null;
  sort: number;
}

interface VoteCount {
  option_id: number;
  count: number;
}

async function checkRateLimit(env: Env, ip: string, failClosed: boolean = false): Promise<boolean> {
  if (!env.RATE_LIMITER) {
    return true;
  }

  try {
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    return success;
  } catch (error) {
    console.error('Rate limiter error:', error);
    return !failClosed;
  }
}

async function hashVoter(ip: string, pollSlug: string, salt: string): Promise<string> {
  const data = `${ip}|${pollSlug}|${salt}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': status === 200 ? 'private, max-age=0' : 'no-store',
      ...extraHeaders,
    },
  });
}

async function getPoll(env: Env, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathMatch = url.pathname.match(/^\/api\/polls\/([^/]+)$/);

  if (!pathMatch) {
    return jsonResponse({ error: 'Invalid poll endpoint' }, 404);
  }

  if (!env.VOTE_SALT) {
    return jsonResponse({ error: 'Service not configured', code: 'NOT_CONFIGURED' }, 503);
  }

  const pollSlug = pathMatch[1];

  const poll = await env.DB.prepare('SELECT * FROM polls WHERE slug = ? AND status = ?')
    .bind(pollSlug, 'active')
    .first<Poll>();

  if (!poll) {
    return jsonResponse({ error: 'Poll not found' }, 404);
  }

  const options = await env.DB.prepare('SELECT * FROM options WHERE poll_id = ? ORDER BY sort')
    .bind(poll.id)
    .all<PollOption>();

  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) {
    return jsonResponse({ error: 'IP address required', code: 'IP_REQUIRED' }, 400);
  }

  const voterHash = await hashVoter(ip, pollSlug, env.VOTE_SALT);

  const hasVoted = await env.DB.prepare('SELECT 1 FROM votes WHERE poll_id = ? AND voter_hash = ?')
    .bind(poll.id, voterHash)
    .first();

  const result: {
    slug: string;
    question: string;
    options: Array<{
      slug: string;
      label: string;
      tool_slug: string | null;
      count?: number;
      percentage?: number;
    }>;
    has_voted: boolean;
    total_votes?: number;
  } = {
    slug: poll.slug,
    question: poll.question,
    options: options.results.map((opt) => ({
      slug: opt.slug,
      label: opt.label,
      tool_slug: opt.tool_slug,
    })),
    has_voted: !!hasVoted,
  };

  if (hasVoted) {
    const voteCounts = await env.DB.prepare(
      'SELECT option_id, COUNT(*) as count FROM votes WHERE poll_id = ? GROUP BY option_id'
    )
      .bind(poll.id)
      .all<VoteCount>();

    const countsMap = new Map(voteCounts.results.map((vc) => [vc.option_id, vc.count]));
    const totalVotes = Array.from(countsMap.values()).reduce((sum, count) => sum + count, 0);

    result.total_votes = totalVotes;
    result.options = result.options.map((opt, idx) => {
      const optionId = options.results[idx].id;
      const count = countsMap.get(optionId) || 0;
      return {
        ...opt,
        count,
        percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
      };
    });
  }

  return jsonResponse(result);
}

async function vote(env: Env, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathMatch = url.pathname.match(/^\/api\/polls\/([^/]+)\/vote$/);

  if (!pathMatch) {
    return jsonResponse({ error: 'Invalid vote endpoint' }, 404);
  }

  if (!env.VOTE_SALT) {
    return jsonResponse({ error: 'Service not configured', code: 'NOT_CONFIGURED' }, 503);
  }

  const pollSlug = pathMatch[1];

  let body: { option: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }

  if (!body.option) {
    return jsonResponse({ error: 'Missing option' }, 400);
  }

  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) {
    return jsonResponse({ error: 'IP address required', code: 'IP_REQUIRED' }, 400);
  }

  const poll = await env.DB.prepare('SELECT * FROM polls WHERE slug = ? AND status = ?')
    .bind(pollSlug, 'active')
    .first<Poll>();

  if (!poll) {
    return jsonResponse({ error: 'Poll not found' }, 404);
  }

  const option = await env.DB.prepare('SELECT * FROM options WHERE poll_id = ? AND slug = ?')
    .bind(poll.id, body.option)
    .first<PollOption>();

  if (!option) {
    return jsonResponse({ error: 'Invalid option' }, 400);
  }

  const voterHash = await hashVoter(ip, pollSlug, env.VOTE_SALT);

  const existingVote = await env.DB.prepare('SELECT 1 FROM votes WHERE poll_id = ? AND voter_hash = ?')
    .bind(poll.id, voterHash)
    .first();

  if (existingVote) {
    return jsonResponse({ error: 'Already voted', code: 'ALREADY_VOTED' }, 409);
  }

  try {
    await env.DB.prepare('INSERT INTO votes (poll_id, voter_hash, option_id) VALUES (?, ?, ?)')
      .bind(poll.id, voterHash, option.id)
      .run();
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return jsonResponse({ error: 'Already voted', code: 'ALREADY_VOTED' }, 409);
    }
    throw error;
  }

  const voteCounts = await env.DB.prepare(
    'SELECT option_id, COUNT(*) as count FROM votes WHERE poll_id = ? GROUP BY option_id'
  )
    .bind(poll.id)
    .all<VoteCount>();

  const options = await env.DB.prepare('SELECT * FROM options WHERE poll_id = ? ORDER BY sort')
    .bind(poll.id)
    .all<PollOption>();

  const countsMap = new Map(voteCounts.results.map((vc) => [vc.option_id, vc.count]));
  const totalVotes = Array.from(countsMap.values()).reduce((sum, count) => sum + count, 0);

  return jsonResponse({
    success: true,
    results: {
      slug: poll.slug,
      question: poll.question,
      total_votes: totalVotes,
      options: options.results.map((opt) => {
        const count = countsMap.get(opt.id) || 0;
        return {
          slug: opt.slug,
          label: opt.label,
          tool_slug: opt.tool_slug,
          count,
          percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
        };
      }),
    },
  });
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method;

  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': 'https://devxtools.dev',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }

  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) {
    return jsonResponse({ error: 'IP address required', code: 'IP_REQUIRED' }, 400);
  }

  const allowed = await checkRateLimit(env, ip, method === 'POST');

  if (!allowed) {
    return jsonResponse({ error: 'Rate limit exceeded', code: 'RATE_LIMITED' }, 429);
  }

  if (pathname.match(/^\/api\/polls\/[^/]+$/) && method === 'GET') {
    return getPoll(env, request);
  }

  if (pathname.match(/^\/api\/polls\/[^/]+\/vote$/) && method === 'POST') {
    return vote(env, request);
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ error: 'Internal server error' }, 500);
    }
  },

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const cutoffDate = ninetyDaysAgo.toISOString().replace('T', ' ').substring(0, 19);

      const result = await env.DB.prepare(
        "UPDATE votes SET voter_hash = 'EXPIRED_' || rowid || '_' || poll_id || '_' || option_id || '_' || created_at WHERE created_at < ? AND voter_hash NOT LIKE 'EXPIRED_%'"
      ).bind(cutoffDate).run();

      console.log(`Anonymized ${result.meta.changes || 0} vote hashes older than 90 days`);
    } catch (error) {
      console.error('Scheduled cleanup error:', error);
    }
  },
};
