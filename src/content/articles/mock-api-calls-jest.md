---
title: "How to Mock API Calls in Jest (fetch, axios & MSW)"
description: "Mock API calls in Jest four ways: jest.mock your API module, mock axios, mock fetch, or intercept the network with MSW. TypeScript and Vitest included."
slug: "/guides/mock-api-calls-jest/"
canonical: "https://devxtools.dev/guides/mock-api-calls-jest/"
h1: "How to Mock API Calls in Jest: 4 Approaches Compared"
primary_keyword: "how to mock api calls in jest"
breadcrumbs: [{ name: "Home", url: "/" }, { name: "Guides", url: "/guides/" }, { name: "Mock API calls in Jest", url: "/guides/mock-api-calls-jest/" }]
schema: ["TechArticle", "BreadcrumbList", "FAQPage"]
author: "DevX Tools"
datePublished: "2026-10-15"
dateModified: "2026-10-15"
tested_with: "Jest 30.5.2, ts-jest 29.4.15, TypeScript 6.0.3, axios 1.20.0, axios-mock-adapter 2.1.0, jest-fetch-mock 4.2.0, msw 3.0.3, jest-fixed-jsdom 0.0.11; Node 22.23.3 (levels 1-3) and Node 24.22.0 (MSW); Vitest 5.0.5; 2026-10-15"
tools: ["msw", "nock", "miragejs", "pollyjs", "faker", "fishery"]
---

To mock API calls in Jest, you can work at four levels: your own API module, the HTTP client (axios), the global `fetch`, or the network itself with MSW or Nock. Mock your module for fast component tests, and use MSW when you want the real request code to run against realistic responses.

> **Tested with Jest 30.5.2** (ts-jest 29.4.15, TypeScript 6.0.3) on Node 22.23.3, and the MSW section on Node 24.22.0 (2026-10-15). Every snippet comes from a test file that passed. devxtools.dev is independent and has no relationship with any project mentioned here.

## TL;DR

To mock API calls in Jest, start with `jest.mock` or axios/fetch spies for unit tests, and move to MSW (or Nock) when you need network-level interception. MSW 3 is ESM-only (Node ≥22.12); in our CommonJS/ts-jest runs it needed Node 24.9+ (a Jest requirement for `require()` of ESM) plus `--experimental-vm-modules`; Vitest is the simpler alternative.


## Which approach should you use?

| Approach | What gets mocked | Real HTTP code runs? | Setup effort | Best for |
|---|---|---|---|---|
| `jest.mock('./api')` | Your API functions | No | Lowest | Component and unit tests |
| `jest.mock('axios')` / axios-mock-adapter | The HTTP client | Partly (with the adapter, interceptors and transforms run) | Low | Axios codebases |
| `jest.spyOn(global, 'fetch')` | `fetch` | No (your wrapper does) | Low | Small fetch wrappers |
| MSW `setupServer` | The network | Yes | Medium | Integration-style tests, mocks shared with the browser |

Each level skips more of your real code than the one below it. Mocking your API module is fast and simple, but it can't catch a wrong URL or a broken JSON parse. MSW catches those, at the cost of a bit of setup.

All the examples use this small codebase:

```ts
// src/api.ts
export type User = { id: number; name: string };
const BASE = 'https://api.example.com';

export async function getUser(id: number): Promise<User> {
  const res = await fetch(`${BASE}/users/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
```

```ts
// src/greeting.ts
import { getUser } from './api';
export async function greet(id: number): Promise<string> {
  try {
    const user = await getUser(id);
    return `Hello, ${user.name}!`;
  } catch {
    return 'Hello, guest!';
  }
}
```

## 1. Mock your own API module with jest.mock

The simplest option: replace your API functions and test the caller.

```ts
// __tests__/greeting.test.ts
import { greet } from '../src/greeting';
import { getUser } from '../src/api';

jest.mock('../src/api'); // hoisted above the imports by ts-jest/babel-jest

const mockedGetUser = jest.mocked(getUser);

test('greets the user returned by the API', async () => {
  mockedGetUser.mockResolvedValueOnce({ id: 1, name: 'Ada' });
  await expect(greet(1)).resolves.toBe('Hello, Ada!');
  expect(mockedGetUser).toHaveBeenCalledWith(1);
});

test('falls back when the API fails', async () => {
  mockedGetUser.mockRejectedValueOnce(new Error('HTTP 500'));
  await expect(greet(1)).resolves.toBe('Hello, guest!');
});
```

`jest.mock(path)` with no factory **automocks** the module: every export becomes a `jest.fn()` that returns `undefined`. `jest.mocked()` gives you the correct TypeScript type. For a mock you reuse across many tests, put a manual mock in `src/__mocks__/api.ts` next to the module.

**What it doesn't test:** the URL, headers, status handling and JSON parsing inside `getUser`.

## 2. Mock axios

```ts
// src/client.ts
import axios from 'axios';
export const client = axios.create({ baseURL: 'https://api.example.com', timeout: 5000 });
export async function listUsers() {
  const { data } = await client.get('/users');
  return data as { id: number; name: string }[];
}
export async function getUserWithAxios(id: number) {
  const { data } = await axios.get(`https://api.example.com/users/${id}`);
  return data;
}
```

### jest.mock('axios') + mockResolvedValueOnce

```ts
import axios from 'axios';
import { getUserWithAxios } from '../src/client';

jest.mock('axios');
const mockedAxios = jest.mocked(axios);

test('jest.mock("axios") + mockResolvedValueOnce', async () => {
  mockedAxios.get.mockResolvedValueOnce({ data: { id: 2, name: 'Linus' } });
  await expect(getUserWithAxios(2)).resolves.toEqual({ id: 2, name: 'Linus' });
});
```

To mock a single method without automocking the whole module, use `jest.spyOn(axios, 'get').mockResolvedValueOnce({ data })`.

### axios instances (axios.create)

Automocking `axios` breaks code that calls `axios.create()` at import time, because the automocked `create` returns `undefined`. Instead of hand-writing a fake instance, attach **axios-mock-adapter** to the real instance.

### axios-mock-adapter

```ts
import MockAdapter from 'axios-mock-adapter';
import { client, listUsers } from '../src/client';

const mock = new MockAdapter(client);
afterEach(() => mock.reset());

test('GET success', async () => {
  mock.onGet('/users').reply(200, [{ id: 1, name: 'Ada' }]);
  await expect(listUsers()).resolves.toEqual([{ id: 1, name: 'Ada' }]);
});

test('error and network error', async () => {
  mock.onGet('/users').replyOnce(500).onGet('/users').networkErrorOnce();
  await expect(listUsers()).rejects.toMatchObject({ response: { status: 500 } });
  await expect(listUsers()).rejects.toThrow('Network Error');
});

test('timeout', async () => {
  mock.onGet('/users').timeoutOnce();
  await expect(listUsers()).rejects.toMatchObject({ code: 'ECONNABORTED' });
});
```

The adapter swaps out only the transport, so your `baseURL`, interceptors and response transforms still run. The axios docs cover both `jest.mock` and axios-mock-adapter in their testing guide.

## 3. Mock fetch

Node 18+ has a global `fetch`, `Response` and `Request` (provided by undici), so you can build realistic responses without a polyfill.

### jest.spyOn(global, 'fetch') with a Response object

```ts
test('jest.spyOn(global, "fetch") with a real Response', async () => {
  const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify({ id: 1, name: 'Ada' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  await expect(getUser(1)).resolves.toEqual({ id: 1, name: 'Ada' });
  expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/users/1');
});
```

Returning a real `Response` beats a hand-made `{ json: () => … }` object, because `res.ok`, `res.status` and `res.json()` behave exactly as they do in production.

### Mocking a specific URL

```ts
test('mock a specific URL only', async () => {
  jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.endsWith('/users/2')) return Response.json({ id: 2, name: 'Linus' });
    return new Response('Not found', { status: 404 });
  });
  await expect(getUser(2)).resolves.toEqual({ id: 2, name: 'Linus' });
  await expect(getUser(3)).rejects.toThrow('HTTP 404');
});
```

### jest-fetch-mock

If you'd rather use a helper library:

```ts
import fetchMock from 'jest-fetch-mock';
fetchMock.enableMocks();
beforeEach(() => fetchMock.resetMocks());

test('jest-fetch-mock', async () => {
  fetchMock.mockResponseOnce(JSON.stringify({ id: 1, name: 'Ada' }));
  await expect(getUser(1)).resolves.toEqual({ id: 1, name: 'Ada' });
});
```

jest-fetch-mock 4.x recommends calling `enableMocks()` from `setupFilesAfterEnv` (or `"setupFilesAfterEnv": ["jest-fetch-mock/setup"]`) so it survives `resetMocks: true`. Don't combine it with MSW in the same test run: both take over `fetch`. In our first run, the jest-fetch-mock test broke once the MSW setup file was active too, so we split them into separate Jest projects (see below).

## 4. Intercept the network with MSW (or Nock)

[MSW](/tools/msw/) intercepts requests below your code, so `getUser` runs exactly as it does in production.

### Requirements first (MSW 3 + Jest)

MSW 3 is **ESM-only and needs Node ≥22.12**. The Node 24 requirement below comes from **Jest**, not from MSW: Jest's docs say `require()` of an ES module works on Node 24.9+, and older versions throw `ERR_REQUIRE_ESM`. Here's what we observed with a CommonJS/ts-jest setup:

- **Node 22.23.3:** failed with "Must use import to load ES Module".
- **Node 24.22.0 with `NODE_OPTIONS=--experimental-vm-modules`:** passed. In our runs the flag was required even on Node 24.
- **TypeScript:** we needed `"module": "nodenext"` / `"moduleResolution": "nodenext"` in `tsconfig.json`. With the older `"node"` resolution, ts-jest couldn't resolve `msw/node`.

Alternatives if you stay on Node 22: use Jest's native ESM mode (`"type": "module"` + `--experimental-vm-modules`), or run the network tests with [Vitest](https://vitest.dev/) (it loaded MSW 3 with no extra config on Node 22.23.3).

### setupServer in jest.setup

```ts
// mocks/handlers.ts
import { http, HttpResponse } from 'msw';
export const handlers = [
  http.get('https://api.example.com/users/:id', ({ params }) =>
    HttpResponse.json({ id: Number(params.id), name: 'Ada' })),
];
```

```ts
// mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);
```

```ts
// jest.setup.ts
import { server } from './mocks/server';
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

```js
// jest.config.js: MSW tests in their own project
const base = { preset: 'ts-jest', testEnvironment: 'node', restoreMocks: true };
module.exports = {
  projects: [
    { ...base, displayName: 'unit', testPathIgnorePatterns: ['/node_modules/', '/__tests__/msw/'] },
    {
      ...base,
      displayName: 'msw',
      testMatch: ['<rootDir>/__tests__/msw/**/*.test.ts'],
      setupFiles: ['<rootDir>/jest.polyfills.js'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    },
  ],
};
```

`onUnhandledFrame` is the MSW 3 name for what MSW 2 called `onUnhandledRequest`. Setting it to `'error'` makes any request you forgot to mock fail loudly.

### Per-test overrides with server.use

```ts
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';

test('per-test override with server.use', async () => {
  server.use(http.get('https://api.example.com/users/:id', () =>
    HttpResponse.json({ id: 2, name: 'Linus' })));
  await expect(greet(2)).resolves.toBe('Hello, Linus!');
});
```

`server.resetHandlers()` in `afterEach` removes the override, so it can't leak into the next test.

### Error and delay states

```ts
test('error state', async () => {
  server.use(http.get('https://api.example.com/users/:id', () => new HttpResponse(null, { status: 500 })));
  await expect(getUser(1)).rejects.toThrow('HTTP 500');
});

test('network error', async () => {
  server.use(http.get('https://api.example.com/users/:id', () => HttpResponse.error()));
  await expect(getUser(1)).rejects.toThrow(); // 'fetch failed' in Node, 'Failed to fetch' in browsers
});

test('delay with fake timers', async () => {
  jest.useFakeTimers();
  server.use(http.get('https://api.example.com/users/:id', async () => {
    await delay(5000);
    return HttpResponse.json({ id: 1, name: 'Slow' });
  }));
  const p = getUser(1);
  await jest.advanceTimersByTimeAsync(5000);
  await expect(p).resolves.toEqual({ id: 1, name: 'Slow' });
  jest.useRealTimers();
});
```

MSW 3 no longer works around fake timers, so a `delay()` only resolves once you advance them.

### Jest + jsdom fetch gotchas

Component tests with React Testing Library usually run in jsdom, and jsdom isn't Node:

- **The stock `jsdom` environment** hid Node's `Request`, so importing `msw/node` failed with `ReferenceError: Request is not defined`. MSW's docs point to the **`jest-fixed-jsdom`** environment for this.
- **With `jest-fixed-jsdom` 0.0.11 alone**, requests still failed (`fetch failed`, caused by `setImmediate is not defined` inside undici).
- **Our workaround** (not in MSW's docs; we found no upstream issue for it on 2026-10-15) was a one-line polyfill:

```js
// jest.polyfills.js (loaded via setupFiles)
const { setImmediate, clearImmediate } = require('node:timers');
Object.assign(globalThis, { setImmediate, clearImmediate });
```

```ts
/** @jest-environment jest-fixed-jsdom */
test('msw under jsdom', async () => {
  await expect(getUser(1)).resolves.toEqual({ id: 1, name: 'Ada' });
});
```

**Nock** is the Node-only alternative at this level. Its scopes assert that each expected request happened. See [MSW vs Nock](/comparisons/msw-vs-nock/) for side-by-side code.

## Typing mocks in TypeScript

- `jest.mocked(fn)` turns an imported function into a typed `jest.MockedFunction`, so `mockResolvedValueOnce` checks your return type.
- `jest.mocked(axios)` types an automocked module. For a hand-built object, `jest.Mocked<typeof axios>` works too.
- `jest.spyOn(global, 'fetch')` is already typed from `lib.dom` or `@types/node`. If you return something that isn't a `Response`, TypeScript complains, which is a good thing.

## Testing errors, retries and timeouts

Use fake timers so retry back-offs don't slow the suite:

```ts
// src/retry.ts
export async function fetchWithRetry(url: string, retries = 2, backoffMs = 1000): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url);
    if (res.ok || attempt >= retries) return res;
    await new Promise((r) => setTimeout(r, backoffMs * 2 ** attempt));
  }
}
```

```ts
test('retries with backoff (fake timers)', async () => {
  jest.useFakeTimers();
  const fetchSpy = jest.spyOn(global, 'fetch')
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(Response.json({ ok: true }));

  const promise = fetchWithRetry('https://api.example.com/flaky');
  await jest.advanceTimersByTimeAsync(1000); // first backoff
  await jest.advanceTimersByTimeAsync(2000); // second backoff
  const res = await promise;

  expect(res.status).toBe(200);
  expect(fetchSpy).toHaveBeenCalledTimes(3);
  jest.useRealTimers();
});
```

`advanceTimersByTimeAsync` (rather than the sync version) lets pending promises settle between timers. For axios timeouts, `mock.onGet(url).timeoutOnce()` from axios-mock-adapter is the simplest option (see above).

## Same patterns in Vitest

Vitest mirrors Jest's API with `vi` (tested with Vitest 5.0.5):

```js
import { test, expect, vi, afterEach } from 'vitest';
import { greet } from '../src/greeting.js';
import { getUser } from '../src/api.js';

vi.mock('../src/api.js'); // hoisted, like jest.mock
afterEach(() => vi.restoreAllMocks());

test('vi.mock + vi.mocked', async () => {
  vi.mocked(getUser).mockResolvedValueOnce({ id: 1, name: 'Ada' });
  await expect(greet(1)).resolves.toBe('Hello, Ada!');
});

test('vi.spyOn(globalThis, "fetch")', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json({ ok: true }));
  const res = await fetch('https://api.example.com/x');
  expect(await res.json()).toEqual({ ok: true });
});
```

MSW's `setupServer` code is identical in Vitest, and it ran on Node 22 without any flags.

## Common mistakes

- **Mocks leaking between tests.** Set `restoreMocks: true` (or call `jest.restoreAllMocks()` in `afterEach`) and `server.resetHandlers()`. `resetAllMocks` clears implementations. `restoreAllMocks` also restores `spyOn` originals.
- **`mockResolvedValue` vs `mockResolvedValueOnce`.** The first applies to every call, the second to the next call only. Chain several `Once` calls for sequences such as retries.
- **Hoisting surprises.** `jest.mock()` is hoisted above imports in CommonJS, so a factory can't reference variables declared later, except ones whose names start with `mock`. In native ESM, hoisting doesn't happen: use `jest.unstable_mockModule()` and dynamic `import()`.
- **Forgetting `await`.** `expect(promise).rejects…` must be awaited (or returned). Otherwise the test passes before the assertion runs.
- **Mocking too high.** If every test mocks your API module, nothing checks the HTTP layer. Keep a few MSW-level tests for each endpoint.
- **Unrealistic data.** Generate shapes with [Faker](/tools/faker/) or typed factories with [Fishery](/tools/fishery/) instead of `{ name: 'test' }` everywhere.

## FAQ

### How do I mock an API call in Jest?
Mock the function that makes it: `jest.mock('./api')`, then `jest.mocked(getUser).mockResolvedValueOnce(data)`. To exercise the real request code, intercept the network with MSW instead.

### How do I mock fetch in Jest with TypeScript?
Use `jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(data), { status: 200 }))`. It's typed out of the box on Node 18+.

### How do I mock axios in Jest?
Use `jest.mock('axios')` plus `jest.mocked(axios).get.mockResolvedValueOnce({ data })` for simple cases. For `axios.create()` instances, use axios-mock-adapter: `new MockAdapter(client).onGet('/users').reply(200, data)`.

### How do I mock a specific URL?
Use `jest.spyOn(global, 'fetch').mockImplementation(async (input) => …)` and branch on the URL. With MSW, write a handler for that URL and let `onUnhandledFrame: 'error'` catch everything else.

### Should I use MSW or jest.mock?
Both. Use `jest.mock` for fast tests of components and business logic, and MSW for tests that should prove the request and response handling works. MSW also lets you reuse the same handlers in the browser and Storybook.

### How do I mock API errors in Jest?
Use `mockRejectedValueOnce(new Error(...))` for module mocks, `mock.onGet(...).replyOnce(500)` / `networkErrorOnce()` with axios-mock-adapter, `new Response(null, { status: 500 })` for fetch, and `HttpResponse.error()` or a 500 response in MSW.

## Related

[MSW](/tools/msw/) · [Nock](/tools/nock/) · [Mirage JS](/tools/miragejs/) · [Polly.JS](/tools/pollyjs/) · [Faker](/tools/faker/) · [Fishery](/tools/fishery/) · [MSW vs Nock](/comparisons/msw-vs-nock/) · [Mocking & test data tools](/mocking-test-data/) · [Testing hub](/testing/)

External docs (no tool pages yet): [Jest](https://jestjs.io/docs/mock-functions) · [Vitest](https://vitest.dev/guide/mocking) · [axios-mock-adapter](https://github.com/ctimmerm/axios-mock-adapter)

---

## Sources (checked 2026-10-15)

- Jest mock functions and `jest.mocked`: https://jestjs.io/docs/mock-functions · https://jestjs.io/docs/jest-object
- Jest ESM support and `require(esm)` on Node 24.9+: https://jestjs.io/docs/ecmascript-modules
- axios testing guide: https://axios.rest/pages/advanced/testing
- axios-mock-adapter: https://github.com/ctimmerm/axios-mock-adapter
- jest-fetch-mock 4.x README: https://github.com/jefflau/jest-fetch-mock
- MSW v3 release notes (ESM-only, Node 22+, `onUnhandledFrame`, fake timers): https://github.com/mswjs/msw/releases/tag/v3.0.0 · MSW Node integration: https://mswjs.io/docs/integrations/node
- jest-fixed-jsdom (recommended in MSW FAQ): https://mswjs.io/docs/faq · https://github.com/mswjs/jest-fixed-jsdom
- Vitest mocking: https://vitest.dev/guide/mocking
- Our runs (2026-10-15): Jest 30.5.2 + ts-jest 29.4.15 + TypeScript 6.0.3. Levels 1–3 and retries: 11/11 passed on Node 22.23.3. With MSW: 17/17 passed on Node 24.22.0 with `--experimental-vm-modules`. Vitest 5.0.5 on Node 22.23.3: passed.
