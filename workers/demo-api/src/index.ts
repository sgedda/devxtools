/**
 * Demo API for devxtools.dev guides and demos
 * A stable, read-only fake REST API with scenario helpers
 */

interface Env {
  RATE_LIMITER?: RateLimit;
}

interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

const FAKE_TASKS = [
  { id: 1, title: 'Set up project repository', completed: true, userId: 1 },
  { id: 2, title: 'Write API documentation', completed: true, userId: 1 },
  { id: 3, title: 'Deploy to production', completed: false, userId: 2 },
  { id: 4, title: 'Add integration tests', completed: false, userId: 2 },
  { id: 5, title: 'Review pull requests', completed: false, userId: 3 },
];

const FAKE_USERS = [
  { id: 1, name: 'Alice Developer', email: 'alice@example.com', role: 'Engineering' },
  { id: 2, name: 'Bob Designer', email: 'bob@example.com', role: 'Design' },
  { id: 3, name: 'Charlie Manager', email: 'charlie@example.com', role: 'Product' },
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-DevX-Req-Id',
  'Access-Control-Max-Age': '86400',
};

function corsHeaders(headers: Record<string, string> = {}) {
  return { ...CORS_HEADERS, ...headers };
}

function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: corsHeaders({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60',
      ...extraHeaders,
    }),
  });
}

async function checkRateLimit(env: Env, ip: string): Promise<boolean> {
  if (!env.RATE_LIMITER) {
    return true;
  }
  
  try {
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    return success;
  } catch {
    return true;
  }
}

function getOpenApiSpec() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'DevXTools Demo API',
      version: '1.0.0',
      description: 'A stable, read-only fake REST API for guides and demos',
      contact: {
        url: 'https://devxtools.dev',
      },
    },
    servers: [
      {
        url: 'https://demo.devxtools.dev',
        description: 'Production',
      },
    ],
    paths: {
      '/': {
        get: {
          summary: 'API Index',
          responses: {
            '200': {
              description: 'Available endpoints',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      version: { type: 'string' },
                      endpoints: { type: 'object' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/tasks': {
        get: {
          summary: 'List all tasks',
          responses: {
            '200': {
              description: 'List of tasks',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        title: { type: 'string' },
                        completed: { type: 'boolean' },
                        userId: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: 'Create a task (non-persistent)',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    userId: { type: 'integer' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Task created (echo only, not persisted)',
            },
          },
        },
      },
      '/tasks/{id}': {
        get: {
          summary: 'Get a specific task',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          responses: {
            '200': { description: 'Task found' },
            '404': { description: 'Task not found' },
          },
        },
        put: {
          summary: 'Update a task (non-persistent)',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          responses: {
            '200': { description: 'Task updated (echo only)' },
          },
        },
        delete: {
          summary: 'Delete a task (non-persistent)',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          responses: {
            '204': { description: 'Task deleted (echo only)' },
          },
        },
      },
      '/users': {
        get: {
          summary: 'List all users',
          responses: {
            '200': { description: 'List of users' },
          },
        },
      },
      '/users/{id}': {
        get: {
          summary: 'Get a specific user',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          responses: {
            '200': { description: 'User found' },
            '404': { description: 'User not found' },
          },
        },
      },
      '/status/{code}': {
        get: {
          summary: 'Return a specific HTTP status code',
          parameters: [
            {
              name: 'code',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          responses: {
            '200': { description: 'Any status code' },
          },
        },
      },
      '/delay/{ms}': {
        get: {
          summary: 'Delay response (max 5000ms)',
          parameters: [
            {
              name: 'ms',
              in: 'path',
              required: true,
              schema: { type: 'integer', maximum: 5000 },
            },
          ],
          responses: {
            '200': { description: 'Delayed response' },
          },
        },
      },
      '/flaky': {
        get: {
          summary: 'Randomly fails ~1 in 3 requests',
          responses: {
            '200': { description: 'Success' },
            '503': { description: 'Random failure' },
          },
        },
      },
      '/openapi.json': {
        get: {
          summary: 'This OpenAPI spec',
          responses: {
            '200': { description: 'OpenAPI 3.1 specification' },
          },
        },
      },
    },
  };
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { pathname, searchParams } = url;
  const method = request.method;

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const allowed = await checkRateLimit(env, ip);
  
  if (!allowed) {
    return jsonResponse({ error: 'Rate limit exceeded' }, 429);
  }

  if (pathname === '/' && method === 'GET') {
    return jsonResponse({
      name: 'DevXTools Demo API',
      version: '1.0.0',
      description: 'A stable, read-only fake REST API for guides and demos',
      endpoints: {
        resources: ['/tasks', '/tasks/:id', '/users', '/users/:id'],
        scenarios: ['/status/:code', '/delay/:ms', '/flaky'],
        documentation: ['/openapi.json'],
      },
      notes: [
        'POST, PUT, DELETE are accepted but non-persistent (echo only)',
        'All responses include CORS headers for any origin',
        'Rate limited per IP',
      ],
    });
  }

  if (pathname === '/openapi.json' && method === 'GET') {
    return jsonResponse(getOpenApiSpec());
  }

  if (pathname === '/tasks' && method === 'GET') {
    return jsonResponse(FAKE_TASKS);
  }

  if (pathname === '/tasks' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const newTask = {
      id: FAKE_TASKS.length + 1,
      title: (body as { title?: string }).title || 'New task',
      completed: false,
      userId: (body as { userId?: number }).userId || 1,
    };
    return jsonResponse(
      { ...newTask, _note: 'Not persisted. This is a demo API.' },
      201
    );
  }

  const taskMatch = pathname.match(/^\/tasks\/(\d+)$/);
  if (taskMatch) {
    const id = parseInt(taskMatch[1], 10);
    const task = FAKE_TASKS.find((t) => t.id === id);

    if (method === 'GET') {
      if (!task) {
        return jsonResponse({ error: 'Task not found' }, 404);
      }
      return jsonResponse(task);
    }

    if (method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      return jsonResponse({
        ...(task || { id }),
        ...(body as object),
        _note: 'Not persisted. This is a demo API.',
      });
    }

    if (method === 'DELETE') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders({ 'X-Note': 'Not persisted. This is a demo API.' }),
      });
    }
  }

  if (pathname === '/users' && method === 'GET') {
    return jsonResponse(FAKE_USERS);
  }

  const userMatch = pathname.match(/^\/users\/(\d+)$/);
  if (userMatch && method === 'GET') {
    const id = parseInt(userMatch[1], 10);
    const user = FAKE_USERS.find((u) => u.id === id);
    if (!user) {
      return jsonResponse({ error: 'User not found' }, 404);
    }
    return jsonResponse(user);
  }

  const statusMatch = pathname.match(/^\/status\/(\d+)$/);
  if (statusMatch && method === 'GET') {
    const code = parseInt(statusMatch[1], 10);
    if (code < 100 || code > 599) {
      return jsonResponse({ error: 'Invalid status code' }, 400);
    }
    return jsonResponse({ status: code, message: `Status ${code}` }, code);
  }

  const delayMatch = pathname.match(/^\/delay\/(\d+)$/);
  if (delayMatch && method === 'GET') {
    const ms = Math.min(parseInt(delayMatch[1], 10), 5000);
    await new Promise((resolve) => setTimeout(resolve, ms));
    return jsonResponse({ delayed: ms, message: `Delayed ${ms}ms` });
  }

  if (pathname === '/flaky' && method === 'GET') {
    const shouldFail = Math.random() < 0.33;
    if (shouldFail) {
      return jsonResponse(
        { error: 'Service temporarily unavailable', flaky: true },
        503
      );
    }
    return jsonResponse({ success: true, message: 'Request succeeded' });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      return jsonResponse(
        { error: 'Internal server error', message: String(error) },
        500
      );
    }
  },
};
