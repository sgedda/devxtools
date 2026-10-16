import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { fetchUser } from './api.js';

const server = setupServer(
  http.get('https://api.example.com/users/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'Test User',
      email: 'test@example.com'
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('fetchUser', () => {
  it('fetches user data successfully', async () => {
    const user = await fetchUser('123');
    
    expect(user).toEqual({
      id: '123',
      name: 'Test User',
      email: 'test@example.com'
    });
  });

  it('handles HTTP errors', async () => {
    server.use(
      http.get('https://api.example.com/users/:id', () => {
        return new HttpResponse(null, { status: 404 });
      })
    );

    await expect(fetchUser('999')).rejects.toThrow('HTTP 404');
  });
});
