---
title: "MSW vs Nock vs Polly.js: Which HTTP Mocking Library?"
description: "MSW, Nock and Polly.js compared for JS/TS HTTP mocking: interception model, runtimes, record/replay and 2026 maintenance status, plus which to pick."
slug: "/comparisons/msw-vs-nock-vs-polly/"
canonical: "https://devxtools.dev/comparisons/msw-vs-nock-vs-polly/"
h1: "MSW vs Nock vs Polly.js: Choosing a JavaScript HTTP Mocking Library"
subtitle: "Handlers, interceptors or recordings: pick by runtime and approach"
primary_keyword: "javascript http mocking library"
breadcrumbs: [{ name: "Home", url: "/" }, { name: "Comparisons", url: "/comparisons/" }, { name: "MSW vs Nock vs Polly.js", url: "/comparisons/msw-vs-nock-vs-polly/" }]
schema: ["TechArticle", "BreadcrumbList"]
author: "DevX Tools"
datePublished: "2026-10-14"
dateModified: "2026-10-19"
tools: ["msw", "nock", "pollyjs"]
replaces: "src/pages/comparisons/msw-vs-nock-vs-polly.astro (keep URL, datePublished, code examples, layout components; update title, description, H1, body, dateModified, jsonLd headline/description)"
---
*Handlers, interceptors or recordings: pick by runtime and approach*

## TL;DR

Pick **MSW** if your mocks need to run in the browser as well as Node, or you want one set of handlers for tests, the dev server and Storybook. Pick **Nock** if you only test Node code and want strict per-test expectations plus built-in recording (`nock.back`). **Polly.js** still works for record/replay in Node and the browser, but its core hasn't had a release since July 2023, so for new projects look at [maintained Polly.js alternatives](/comparisons/pollyjs-alternatives/) first.

Only deciding between the first two? Read [MSW vs Nock head-to-head, with code](/comparisons/msw-vs-nock/).

## Three approaches to HTTP mocking

- **Handlers (MSW):** you describe the API with request handlers, and MSW answers matching requests at the network level, through a Service Worker in the browser and request interception in Node.
- **Interceptors with expectations (Nock):** each test declares which outbound requests must happen and what they return. Nock is Node-only.
- **Recordings (Polly.js):** you run the test against the real API once, Polly saves the traffic, and later runs replay it. Adapters cover fetch, XHR, Node's HTTP module and Puppeteer.

## Quick comparison

| | MSW | Nock | Polly.js |
|---|---|---|---|
| Approach | Request handlers | Per-test expectations | Record and replay |
| Browser | Yes | No | Yes |
| Node.js | Yes | Yes | Yes |
| Built-in record/replay | No | Yes (`nock.back`) | Yes (core feature) |
| Latest release (checked 2026-10-19) | 3.0.3 (2026-10-10) | 15.0.2 (2026-10-16) | core 6.0.6 (2023-07-20); adapter-fetch 6.0.7 (2025-05-31) |

For the line-by-line MSW and Nock code (Jest and Vitest setup, POST matching, errors, delays, assertions), see [MSW vs Nock head-to-head, with code](/comparisons/msw-vs-nock/).

## Which library for which runtime?

| You're testing… | Start with | Notes |
|---|---|---|
| Node backend, SDK or CLI | Nock or MSW | Nock for strict expectations; MSW if the same handlers are reused elsewhere. |
| Browser app (unit tests, dev server, Storybook) | MSW | Nock can't run in the browser. |
| React Native | See our [React Native mocking guide](/guides/mock-api-react-native/) | MSW 3 removed `msw/native`, and its replacement isn't on npm yet. |
| Playwright E2E | MSW (`@msw/playwright`) or Playwright's own `route` / `routeFromHAR` | Recording a HAR and replaying it is built into Playwright. |
| Replaying recorded real traffic | Nock's `nock.back` (Node) or a maintained recorder | See [maintained Polly.js alternatives](/comparisons/pollyjs-alternatives/). |

## MSW (Mock Service Worker)

**Strengths**
- The same handlers work in Node tests, the browser, Storybook and Playwright.
- Intercepts at the network level, so your app code and HTTP client stay unchanged.
- Supports REST, GraphQL and WebSocket.

**Limits**
- No built-in recorder.
- Browser use needs the Service Worker script set up.

```ts
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('https://api.example.com/api/user', () => {
    return HttpResponse.json({ id: 1, name: 'John' })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

How it stacks up against Nock in detail: [MSW vs Nock head-to-head, with code](/comparisons/msw-vs-nock/).

## Nock

**Strengths**
- A small API with strict, one-shot expectations that fail when an expected request isn't made.
- Built-in record and replay with `nock.back`.
- Supports native `fetch` since v14.

**Limits**
- Node.js only.
- Don't combine it with MSW in the same test file, since both intercept the same layer.

```ts
import nock from 'nock'

nock('https://api.example.com')
  .get('/user/1')
  .reply(200, { id: 1, name: 'John' })

// Matching requests in your test are now intercepted
```

## Polly.js in 2026: when it's still fine

> **Maintenance status (checked October 2026).** The latest `@pollyjs/core` is 6.0.6, released 2023-07-20. The only release since then is `@pollyjs/adapter-fetch` 6.0.7 on 2025-05-31. The GitHub repository (Netflix/pollyjs) isn't archived. Sources: npm registry, GitHub.

Polly.js records real HTTP traffic and replays it, with adapters for fetch, XHR and Node's HTTP module, and persisters for the file system, local storage and a REST server. It is still a reasonable choice if:

- An existing suite already uses it and the recordings are working.
- You're on the adapters it supports and don't need fixes upstream.

For new projects, a library without a core release in more than three years is a risk. Compare [maintained Polly.js alternatives](/comparisons/pollyjs-alternatives/) before you adopt it.

```ts
import { Polly } from '@pollyjs/core'
import NodeHttpAdapter from '@pollyjs/adapter-node-http'
import FSPersister from '@pollyjs/persister-fs'

Polly.register(NodeHttpAdapter)
Polly.register(FSPersister)

const polly = new Polly('My Test', {
  adapters: ['node-http'],
  persister: 'fs'
})

// Polly records and replays automatically
```

## Which should you choose?

- **MSW** if mocks must work outside Node, or you want one set of handlers across tests, development and Storybook.
- **Nock** if you only test Node code and want each test to state exactly which calls must happen.
- **Polly.js** only if you already depend on it. For new record/replay setups, see [maintained Polly.js alternatives](/comparisons/pollyjs-alternatives/).

## Related

[MSW](/tools/msw/) · [Nock](/tools/nock/) · [Polly.js](/tools/pollyjs/) · [MSW vs Nock head-to-head, with code](/comparisons/msw-vs-nock/) · [Polly.js alternatives](/comparisons/pollyjs-alternatives/) · [All comparisons](/comparisons/)

## Sources (checked 2026-10-19)

- @pollyjs/core on npm: https://registry.npmjs.org/@pollyjs/core
- @pollyjs/adapter-fetch on npm: https://registry.npmjs.org/@pollyjs/adapter-fetch
- Polly.js repository: https://github.com/Netflix/pollyjs
- MSW docs: https://mswjs.io/docs/
- MSW v3.0.0 release notes: https://github.com/mswjs/msw/releases/tag/v3.0.0
- Nock: https://github.com/nock/nock
- Nock on npm: https://registry.npmjs.org/nock
- Playwright routeFromHAR: https://playwright.dev/docs/mock#replaying-from-har
