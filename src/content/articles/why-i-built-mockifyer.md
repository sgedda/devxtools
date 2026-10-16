---
title: "Why I Built Mockifyer: Recording Real API Traffic as Mocks"
description: "The story behind Mockifyer: record real HTTP traffic, switch scenarios, mock React Native backends and trace calls across services. By its creator."
slug: "/blog/why-i-built-mockifyer/"
canonical: "https://devxtools.dev/blog/why-i-built-mockifyer/"
h1: "Why I Built Mockifyer: Recording Real API Traffic as Mocks"
primary_keyword: "record api responses as mocks"
secondary_keywords: ["why I built mockifyer", "mockifyer"]
breadcrumbs: [{ name: "Home", url: "/" }, { name: "Blog", url: "/blog/" }, { name: "Why I Built Mockifyer", url: "/blog/why-i-built-mockifyer/" }]
schema: ["TechArticle", "BreadcrumbList"]
author: "Sebastian Gedda"
byline: "By Sebastian Gedda, creator and maintainer of Mockifyer"
datePublished: "2026-10-16"
dateModified: "2026-10-16"
---

*By Sebastian Gedda. Written by the creator: I built and maintain [Mockifyer](https://github.com/sgedda/mockifyer), the open-source tool this post is about. devxtools.dev is my own independent guide site, so read this as a maker's account, not a neutral review. If you want the neutral-ish overview, there's a [Mockifyer tool page](/tools/mockifyer/).*

Mockifyer is an MIT-licensed library that lets you record API responses as mocks: it intercepts real HTTP calls made through `fetch` or axios, saves them as JSON, and replays them later. You can group those mocks into named scenarios and switch between them. It grew out of a very specific kind of frustration, so I'll start there.

## The problem: an app that depended on everything

Before Mockifyer existed, I was working on a React Native app backed by our own BFF (backend-for-frontend). The BFF in turn talked to a long list of underlying systems that other teams owned. Almost every screen showed data that was assembled from several of them.

That made everyday development and testing harder than it should have been:

- **Setting up the "right" data was admin work.** To see a particular screen state, someone had to create the matching booking in several underlying systems by hand.
- **Test data didn't stay put.** Bookings disappeared from the test environment, or they simply got old and dropped out of the views we were working on. Then we had to add them again.
- **Dates drifted.** I wanted to look at a booking in one exact, deterministic state. But "departs in three days" is only true for one day, and after that the screen shows something else.

None of this is unusual. If your app sits on top of systems you don't control, you probably know the feeling.

## The first fix, and why it didn't scale

Our first answer was pragmatic. We added hardcoded overrides in the backend, plus a small web admin UI where you could override specific underlying values, such as the start and end dates of a flight.

It worked, but it had real costs:

- It meant a lot of special-case code in the backend.
- It was tied to one specific test user.
- That user had one fixed set of bookings. If you wanted a different "world" (no bookings, many bookings, check-in open), you were out of luck.

What I actually wanted was to stop editing backend code to fake states, and instead capture what the real systems returned and be able to swap whole sets of data in and out.

## The idea: record the traffic, switch the world

That became the idea behind Mockifyer:

1. **Record real HTTP traffic** through a library that sits in the HTTP client, so you start from responses the real systems actually produced.
2. **Switch "worlds" through scenarios.** A scenario is a named set of mocks: no trips, one trip, many trips, check-in open. Changing scenario changes the world the app sees.

Everything else in the project grew around those two ideas.

## What it is today

Mockifyer is a TypeScript monorepo. Most of it is published as scoped npm packages; two pieces are repo only for now:

| Package | What it's for |
|---|---|
| `@sgedda/mockifyer-core` | Types, storage providers, scenarios, request matching, date helpers |
| `@sgedda/mockifyer-fetch` | `fetch` and React Native integration, including the Metro middleware |
| `@sgedda/mockifyer-axios` | Axios integration (Node services) |
| `@sgedda/mockifyer-dashboard` | Local web UI: browse and edit mocks, scenarios, client lanes, network log, Redis/SQLite store and proxy |
| `@sgedda/mockifyer-test-helper` | Test utilities (repo only: not on npm at the time of writing) |
| `@sgedda/mockifyer-mcp` | MCP server that exposes dashboard APIs to AI clients (repo only: not on npm at the time of writing, so you build it from the repo) |

It targets Node services and React Native/Expo apps first (the repo also has a demo web app), and there's a playground at [mockifyer.dev](https://mockifyer.dev/) if you want to try it without installing anything.

### The core loop in a fresh project

To check that the basics really work as I describe them, I ran this in an empty Node project with the published packages:

```bash
npm install @sgedda/mockifyer-core @sgedda/mockifyer-fetch
```

```js
// app.mjs (ESM, so top-level await works)
import { setupMockifyer } from '@sgedda/mockifyer-fetch';

setupMockifyer({
  mockDataPath: './mock-data',
  useGlobalFetch: true,
  recordMode: process.env.MOCKIFYER_RECORD === 'true',
});

const res = await fetch('http://127.0.0.1:4555/api/bookings?x=1');
```

I ran it once with `MOCKIFYER_RECORD=true` and the env vars below against a small local API. Mockifyer saved the response under `mock-data/default/`. Then I stopped the API and ran it again. The second run logged `Mock hit: GET http://127.0.0.1:4555/api/bookings` and returned the recorded body, with no server running.

There's one thing to know up front, because the defaults are deliberately conservative. Out of the box, Mockifyer doesn't immediately replay what it records:

- Domain-path rules default to an allowlist. New hosts and paths are *discovered* into `domain-path-rules.json` with recording off until you turn them on.
- New recordings default to `alwaysUseRealApi: true`. They're stored, but the live API is still used until you flip them in the dashboard.

For the quick test above I set these env vars to get the "record once, replay immediately" behavior:

```bash
MOCKIFYER_SCENARIO=default
MOCKIFYER_DOMAIN_PATH_RULES_MODE=record_all
MOCKIFYER_RECORD_DEFAULT_ALWAYS_USE_REAL_API=false
```

On a real team I'd keep the defaults and enable paths on purpose. I just don't want anyone to try the five-line version and wonder why nothing replays.

A recorded mock is plain JSON with the request (method, URL, query params, headers) and the response (status, headers, body), so you can diff it, grep it and review it in a pull request.

### Switching mock scenarios

Scenarios are folders: `mock-data/<scenario>/...`. To switch mock scenarios in that same test project, I copied `default` to a new `bookings-cancelled` folder, changed one field in the JSON, and ran with `MOCKIFYER_SCENARIO=bookings-cancelled`. The same request returned the edited response. With `MOCKIFYER_SCENARIO=default`, it returned the original again. That's the whole "switch the world" idea, in its simplest form.

Scenarios can also come from config, `scenario-config.json`, the dashboard, or a client lane (more on lanes below). If nothing selects one, traffic goes into a temporary `_scratch` bucket rather than `default`. So pick a named scenario for anything you want to keep.

Dates have their own helper. If your code calls `getCurrentDate()` instead of `new Date()`, a fixed date or offset applies:

```js
import { setupMockifyer } from '@sgedda/mockifyer-fetch';
import { getCurrentDate } from '@sgedda/mockifyer-core';

setupMockifyer({
  mockDataPath: './mock-data',
  dateManipulation: { fixedDate: '2024-01-01T00:00:00.000Z' },
});
getCurrentDate().toISOString(); // 2024-01-01T00:00:00.000Z
```

That only covers dates your own code reads. Dates inside recorded responses are a separate thing, and the dashboard has date overrides for those.

## React Native plus a backend

This is the setup I built it for. More detail is in the [React Native mocking guide](/guides/react-native-mocking-mockifyer/), but here's the shape of it.

In the app, `@sgedda/mockifyer-fetch` patches `global.fetch`. When you use the dashboard with a shared store, there's a preset for that:

```ts
import {
  initMockifyerForReactNativeDashboard,
  isMockifyerReactNativeActive,
} from '@sgedda/mockifyer-fetch';

export async function initializeMockifyer() {
  const result = await initMockifyerForReactNativeDashboard({
    isDev: __DEV__,
    mockDataPath: 'mock-data',
    bundledDataPath: './assets/mock-data',
    dashboardBaseUrl: 'http://localhost:3002',
    recordMode: __DEV__ && process.env.MOCKIFYER_RECORD === 'true',
    config: { logging: 'info' },
  });
  return result;
}
```

In development, the Hybrid provider writes mocks both on the device and into the project's `mock-data` folder, through Metro middleware. You add that middleware in `metro.config.js`:

```js
const { getDefaultConfig } = require('expo/metro-config');
const { createMockSyncMiddleware } = require('@sgedda/mockifyer-fetch/metro-sync-middleware');

const config = getDefaultConfig(__dirname);
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) =>
    createMockSyncMiddleware({
      atlasKey: 't',
      dashboardKey: 'd',
      dashboardUrl: process.env.MOCKIFYER_DASHBOARD_URL || 'http://localhost:3002',
    })(middleware),
};
module.exports = config;
```

(Note the `/metro-sync-middleware` subpath. Metro config runs in Node, and the package's Node entry doesn't export the middleware.)

How we ran it on the original project, and how I'd still run it:

- **Per repo, opt-in.** You add it to each repo where you want to trace or mock data. With `MOCKIFYER_MODE=manual` it patches `fetch` but starts disabled, and a dev-menu switch calls `enableMockifyer()`. `launch_client` only activates for E2E launches, and `off` never patches, which is what you want for store builds. Note that if `MOCKIFYER_MODE` is unset, it defaults to `on`.
- **Only against test environments.** It's a development and test tool, not something to leave on in production traffic.
- **Backends join through the dashboard.** When the app and its services should share and switch scenarios together, they all point at a dashboard backed by Redis (or SQLite). Each consumer has a client ID, which Mockifyer calls a **lane**. The dashboard maps each lane to a scenario, so my simulator and a CI run can use different worlds against the same infrastructure.

On the backend side, each Node service uses the same preset idea:

```js
// service.mjs (ESM, so top-level await works)
import { initMockifyerForDashboardProxy } from '@sgedda/mockifyer-fetch';

await initMockifyerForDashboardProxy({
  dashboardBaseUrl: 'http://localhost:3002',
  mockDataPath: './mock-data',
  clientId: 'demo-lane',
});
```

If the dashboard's store isn't healthy, the preset falls back to local filesystem mocks and logs that it did. I ran into this myself: my first attempt pointed at `127.0.0.1` while the dashboard was bound to `localhost`.

For E2E runs, Maestro launch arguments pick the lane and scenario, so every run starts in the same world:

```yaml
- launchApp:
    clearState: true
    arguments:
      mockifyerClientId: e2e-trips-one
      scenario: trips-one
```

## Logging and tracing across services

This is the part I find most useful, and it isn't really about mocking at all.

When a screen shows the wrong thing, the bug can be in the app, in the BFF's merging, or in any of the underlying responses. Here's an example. A checkout page shows the wrong delivery promise. Is the frontend formatting it wrong? Did the gateway pick the wrong field? Did the catalog service return stale data? Normally you go through the logs of three services to find out.

When `setupMockifyer` runs in a Node service, it installs inbound request correlation. Patched `fetch` and axios calls pass a request ID on to downstream services, and the entry service echoes it back as `X-Mockifyer-Request-Id`. With network logging and body capture turned on in the dashboard, you can ask for the whole chain.

I tried this locally with three tiny services, gateway → catalog → inventory, all initialized with the snippet above against a SQLite-backed dashboard:

```bash
npx @sgedda/mockifyer-dashboard --provider sqlite --path ./dash.db --no-open
curl -si http://127.0.0.1:4101/aggregate | grep -i x-mockifyer-request-id
curl -s "http://localhost:3002/api/network-events/trace?requestId=THE_ID&scenario=default" \
  | jq '.trace.hops[] | {method, url, status, source}'
```

The trace came back with both downstream hops, each with its status and a preview of the response body:

```json
{ "method": "GET", "url": "http://127.0.0.1:4102/products/sku-1", "status": 200, "source": "mock-miss" }
{ "method": "GET", "url": "http://127.0.0.1:4103/stock/sku-1",   "status": 200, "source": "mock-miss" }
```

`source` tells you whether a hop was served from a mock or went upstream. Here they were misses, because nothing was recorded yet. With that, "which underlying response made the UI do this?" becomes a lookup instead of an investigation. Two things are easy to trip over. The lane has to be mapped to a scenario in the dashboard. With the default strict-lane setting, a lane with no mapping gets no mocks: its requests go to the real API, or get a 412 if upstream access is blocked for that path. And the Network view shows traffic that goes through the dashboard proxy, not every route in every service.

### The Metro "t" trace

On the React Native side, the same idea lives in the Metro terminal. Press **`t`** and Mockifyer starts an Atlas capture. It clears the hop buffer, enables Mockifyer in the app if it was switched off at runtime, and opens a live page at `/mockifyer-atlas-live`. There you can:

- see the calls the app makes right now as a tree of hops, with nested downstream calls pulled from the dashboard when services are connected;
- expand and collapse each hop to open the request and response;
- search across paths and bodies, which is good for questions like "is there booking data in these payloads that the UI doesn't use yet?"

Press `t` again to stop. The live page also has a **Render** button that writes offline HTML docs of the session to `mock-data/atlas-html/`. Capture only runs while it's active, so it isn't logging everything all day.

## Where AI fits, carefully

The MCP server gives an AI client (Cursor, Claude Desktop) tools against the dashboard: search mocks, read a compact "AI context" for a mock instead of the full body, set field overrides, copy an array item ("one more cancelled booking"), set a lane's scenario, and fetch a network trace. I like the direction, because it keeps edits small and you can see exactly what changed. But it's the newest and least-tested part of the project, it isn't published to npm, and I'd treat it as experimental.

## Limits, and when to use something else

I'd rather you pick the right tool than pick mine:

- **It's a young, single-maintainer project.** The API surface is large and still moving. The repo ships faster than the docs in places. One example: the Metro snippet in REACT_NATIVE.md requires the package root, which doesn't export the middleware in Node. Pin your versions.
- **It intercepts `fetch` and axios.** If your traffic goes through other clients, or you need interception at the network layer in the browser, a service-worker approach like MSW is a better fit.
- **It's JavaScript-side.** If non-JS consumers need a standalone mock server, or you need contract testing between teams, tools built for that (WireMock, Mockoon, Pact-style contract tests) fit better.
- **The defaults take a minute to learn.** Allowlisted paths, passthrough recordings, `_scratch` vs named scenarios, and strict lanes are all there for good reasons on a team. But "record once, replay" isn't zero-config.
- **The dashboard is a local dev tool.** Run it next to your code and test environments. Don't expose it.
- **Multi-service tracing needs the dashboard store** (Redis or SQLite) and services that run Mockifyer. It doesn't replace real distributed tracing in production.

If you're weighing it against similar tools, there's a separate page on [how it compares to Polly.js and other record/replay tools](/comparisons/pollyjs-alternatives/).

## Why I keep working on it

The original pain was never "I need a mocking library". It was "I can't see or reproduce the state my app is in". Recording real traffic gives me a starting point that's true. Scenarios let me keep that state still. And the traces show me which response, from which service, caused what's on the screen.

If that matches a problem you have, the code is at [github.com/sgedda/mockifyer](https://github.com/sgedda/mockifyer). Issues and pull requests are welcome, and so are reports of where the docs are wrong.
