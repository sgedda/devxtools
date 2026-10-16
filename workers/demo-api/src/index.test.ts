import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const SELF = {
  fetch: worker.fetch,
};

describe('Demo API', () => {
  it('GET / returns API index', async () => {
    const request = new Request('http://localhost/');
    const response = await SELF.fetch(request, {} as any, {} as any);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('name', 'DevXTools Demo API');
    expect(data).toHaveProperty('endpoints');
  });

  it('GET /openapi.json returns OpenAPI spec', async () => {
    const request = new Request('http://localhost/openapi.json');
    const response = await SELF.fetch(request, {} as any, {} as any);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('openapi', '3.1.0');
    expect(data).toHaveProperty('info');
    expect(data).toHaveProperty('paths');
  });

  it('GET /tasks returns all tasks', async () => {
    const request = new Request('http://localhost/tasks');
    const response = await SELF.fetch(request, {} as any, {} as any);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('id');
    expect(data[0]).toHaveProperty('title');
  });

  it('GET /tasks/1 returns specific task', async () => {
    const request = new Request('http://localhost/tasks/1');
    const response = await SELF.fetch(request, {} as any, {} as any);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('id', 1);
    expect(data).toHaveProperty('title');
  });

  it('GET /tasks/999 returns 404', async () => {
    const request = new Request('http://localhost/tasks/999');
    const response = await SELF.fetch(request, {} as any, {} as any);
    expect(response.status).toBe(404);
  });

  it('POST /tasks accepts but does not persist', async () => {
    const request = new Request('http://localhost/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test task', userId: 1 }),
    });
    const response = await SELF.fetch(request, {} as any, {} as any);
    expect(response.status).toBe(201);
    
    const data = await response.json();
    expect(data).toHaveProperty('_note');
  });

  it('PUT /tasks/1 accepts but does not persist', async () => {
    const request = new Request('http://localhost/tasks/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    });
    const response = await SELF.fetch(request, {} as any, {} as any);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('_note');
  });

  it('DELETE /tasks/1 returns 204', async () => {
    const request = new Request('http://localhost/tasks/1', {
      method: 'DELETE',
    });
    const response = await SELF.fetch(request, {} as any, {} as any);
    expect(response.status).toBe(204);
  });

  it('GET /users returns all users', async () => {
    const request = new Request('http://localhost/users');
    const response = await SELF.fetch(request, {} as any, {} as any);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('email');
  });

  it('GET /users/1 returns specific user', async () => {
    const request = new Request('http://localhost/users/1');
    const response = await SELF.fetch(request, {} as any, {} as any);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('id', 1);
    expect(data).toHaveProperty('email');
  });

  it('GET /status/200 returns status 200', async () => {
    const request = new Request('http://localhost/status/200');
    const response = await SELF.fetch(request, {} as any, {} as any);
    expect(response.status).toBe(200);
  });

  it('GET /status/404 returns status 404', async () => {
    const request = new Request('http://localhost/status/404');
    const response = await SELF.fetch(request, {} as any, {} as any);
    expect(response.status).toBe(404);
  });

  it('GET /delay/100 delays response', async () => {
    const start = Date.now();
    const request = new Request('http://localhost/delay/100');
    const response = await SELF.fetch(request, {} as any, {} as any);
    const duration = Date.now() - start;
    
    expect(response.status).toBe(200);
    expect(duration).toBeGreaterThanOrEqual(90);
    
    const data = await response.json();
    expect(data).toHaveProperty('delayed', 100);
  });

  it('GET /delay/6000 caps at 5000ms', async () => {
    const request = new Request('http://localhost/delay/6000');
    const response = await SELF.fetch(request, {} as any, {} as any);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('delayed', 5000);
  }, 10000);

  it('GET /flaky returns 200 or 503', async () => {
    const request = new Request('http://localhost/flaky');
    const response = await SELF.fetch(request, {} as any, {} as any);
    expect([200, 503]).toContain(response.status);
  });

  it('OPTIONS requests return CORS headers', async () => {
    const request = new Request('http://localhost/tasks', {
      method: 'OPTIONS',
    });
    const response = await SELF.fetch(request, {} as any, {} as any);
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });

  it('All responses include CORS headers', async () => {
    const request = new Request('http://localhost/tasks');
    const response = await SELF.fetch(request, {} as any, {} as any);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('GET /nonexistent returns 404', async () => {
    const request = new Request('http://localhost/nonexistent');
    const response = await SELF.fetch(request, {} as any, {} as any);
    expect(response.status).toBe(404);
  });
});
