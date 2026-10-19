---
title: "Polly.js Alternatives (2026): Record & Replay HTTP in JS"
description: "Polly.js hasn't had a core release since 2023. Compare record/replay alternatives: nock.back, Talkback, MSW + HAR, Playwright HAR, Mockifyer and more."
slug: "/comparisons/pollyjs-alternatives/"
canonical: "https://devxtools.dev/comparisons/pollyjs-alternatives/"
h1: "Polly.js Alternatives: Recording and Replaying HTTP in JavaScript"
primary_keyword: "polly.js alternatives"
secondary_keywords: ["pollyjs alternative", "polly js alternative", "record and replay http requests node", "vcr javascript", "nock back"]
breadcrumbs: [{ name: "Home", url: "/" }, { name: "Comparisons", url: "/comparisons/" }, { name: "Polly.js alternatives", url: "/comparisons/pollyjs-alternatives/" }]
schema: ["TechArticle", "ItemList", "BreadcrumbList", "FAQPage"]
itemList: ["https://devxtools.dev/tools/nock/", "https://devxtools.dev/tools/msw/", "https://devxtools.dev/tools/playwright/", "https://github.com/ijpiantanida/talkback", "https://github.com/airtasker/proxay", "https://github.com/asmyshlyaev177/test-proxy-recorder", "https://devxtools.dev/tools/wiremock/", "https://devxtools.dev/tools/mockoon/", "https://devxtools.dev/tools/mockifyer/"]
author: "DevX Tools"
datePublished: "2026-10-15"
dateModified: "2026-10-15"
tested_with: "@pollyjs/core 6.0.6 (+ adapter-fetch 6.0.7), nock 15.0.1, msw 3.0.3, @playwright/test 1.64.1 (Chromium), talkback 4.2.0, proxay 1.9.0, @sgedda/mockifyer-core 1.10.181 / -fetch 1.8.100 / -axios 1.10.32, axios 1.20.0 on Node 22.23.3; 2026-10-15"
tools: ["pollyjs", "nock", "msw", "playwright", "wiremock", "mockoon", "mockifyer", "miragejs"]
affiliation: "Mockifyer is built and maintained by Sebastian Gedda, who also runs devxtools.dev."
---

**Looking for Polly.js alternatives?** Polly.JS still gets about 200,000 npm installs a week, but `@pollyjs/core` hasn't had a release since **July 20, 2023**. The only release since then is `@pollyjs/adapter-fetch` 6.0.7, from **May 31, 2025**. The repo isn't archived or deprecated, and it still works. But for new suites, you'll want a maintained recorder.

> **Disclosure.** Mockifyer is built and maintained by Sebastian Gedda, who also runs devxtools.dev. It's one of the tools on this page, and it gets the same template, tests and limits list as every other tool, and it isn't ranked as "best". We have no affiliate links and no commercial ties to any other project here.

> **Tested with** @pollyjs/core 6.0.6, nock 15.0.1, msw 3.0.3, @playwright/test 1.64.1, talkback 4.2.0, proxay 1.9.0 and Mockifyer (core 1.10.181, fetch 1.8.100, axios 1.10.32) on Node 22.23.3, 2026-10-15. For each one, we recorded a local API, changed its responses, and confirmed that the replay returned the recorded data. WireMock, Mockoon and test-proxy-recorder weren't run; those sections cite their docs.

## TL;DR

Polly.js still installs about 200K times a week, but its core hasn't had a release since July 2023, so new projects should pick a maintained recorder: nock's `nock.back` for Node-only tests, Playwright's `routeFromHAR` for browser E2E, or a proxy like Talkback for any language. If you need record/replay for `fetch` and axios in React Native/Expo, with editable per-request JSON mocks and scenarios, Mockifyer covers that case (disclosure: mockifyer is built and maintained by Sebastian Gedda, who also runs devxtools.dev.)

## Is Polly.js still maintained?

| Date | Event (source: npm registry, GitHub) |
|---|---|
| 2021-11-30 | v6.0.0 |
| 2023-07-20 | v6.0.6, the last release of `@pollyjs/core`, `adapter-node-http` and `persister-fs` |
| 2023-09-19 | Last commit before a 20-month gap |
| 2025-05-31 | `@pollyjs/adapter-fetch` 6.0.7: "Undeprecating fetch for node". It's the most recent commit (checked 2026-10-15) |

The repo has 10,249 stars and 61 open issues, and it's **not archived** (2026-10-15). `@pollyjs/core` had 200,347 downloads in the week of October 6–12, 2026.

**What still works.** On Node 22, Polly 6.0.6 recorded and replayed axios (via `adapter-node-http`) and native `fetch` (via `adapter-fetch` with `context: globalThis`). In record mode it logged a harmless "browser is offline" warning.

**The risks.** `adapter-node-http` depends on `nock ^13`, two majors behind, and on its own it **didn't see native `fetch`**: our replay reached the live server. Future Node changes would need a release that may never come.

**Staying on Polly short-term is a valid choice** if your recordings replay and Node isn't changing. Pin versions, replay only in CI, and plan the move.

## What record/replay gives you

Hand-written mocks (MSW handlers, Nock interceptors, [Mirage JS](/tools/miragejs/) models) describe what you *think* the API returns. Recorders capture what it *did* return:

- **Fixtures from real traffic**, including fields you'd never type by hand.
- **Deterministic CI**: replay only, with no network.
- **Drift checks**: re-record, and `git diff` shows what changed.

The cost: recordings can capture tokens, and they go stale.

## How we compared

We compared interception, runtimes, clients, record modes, replay-only CI behaviour, storage, matching, scrubbing and maintenance. Downloads are npm's figures for October 6–12, 2026.

## Polly.js alternatives at a glance

| Tool | Intercepts | Runtimes | Clients | Record modes | Storage | Matching | Scenarios / editing | CI replay-only | Last release | Weekly npm DL | Licence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Polly.js (baseline) | In-process | Node, browser | `http`, fetch, XHR | record, replay, passthrough | HAR | Method, headers, body, order, URL | Edit HAR | `recordIfMissing: false` | core 6.0.6, 2023-07-20 | ~200K | Apache-2.0 |
| nock.back | In-process | Node | `http`, fetch, axios | wild, dryrun, record, update, lockdown | JSON per fixture | Host, method, path, body | Edit JSON | `lockdown` | 15.0.1, 2026-10-06 | ~6.3M (nock) | MIT |
| MSW + fixtures | In-process / Service Worker | Node, browser | `http`, fetch, XHR | None | What you load | Your handlers | In code | `onUnhandledFrame: 'error'` | 3.0.3, 2026-10-10 | ~23.0M | MIT |
| Playwright `routeFromHAR` | Browser | Browser (E2E) | Page requests | `update` on/off | HAR | URL, method, POST body | Edit HAR | `notFound: 'abort'` | 1.64.1, 2026-10-14 | ~76.2M (@playwright/test) | Apache-2.0 |
| Talkback | Proxy | Any language | Any HTTP | NEW, OVERWRITE, DISABLED | JSON5 tapes | Method, URL, headers, body | Edit tapes | `DISABLED` | 4.2.0, 2024-07-10 | ~54K | MIT |
| Proxay | Proxy | Any language | Any HTTP | record, replay, passthrough | YAML tapes | Best-effort or exact | Edit YAML | `--mode replay` | npm 1.9.0, 2024-05-15 | ~3.9K | MIT |
| test-proxy-recorder | Proxy + HAR | Playwright, SSR | Server + browser | record, replay, transparent | `.mock.json`, HAR | Method, path, query hash | Edit files | replay | 1.4.1, 2026-10-13 | ~263 | MIT |
| WireMock record | Mock server (Java) | Any language | Any HTTP | Record, snapshot | JSON mappings | WireMock matchers | Stateful scenarios | Stubs only | 3.13.2, 2025-11-14 | n/a (Java) | Apache-2.0 |
| Mockoon record | Mock server | Any language | Any HTTP | Record (desktop app) | Environment JSON | Path + method | GUI | CLI, no proxy | 9.9.0, 2026-09-16 | ~47K (@mockoon/cli) | MIT |
| Mockifyer* | In-process | Node, React Native | fetch, axios | `recordMode` on/off | JSON per request | Method + URL | Scenarios, dates | `failOnMissingMock` | core 1.10.181, 2026-09-30 | ~207 (core) | MIT |

\*Mockifyer is built and maintained by Sebastian Gedda, who also runs devxtools.dev.

## The alternatives

### nock + nock.back

The most-used maintained Node option: record into a JSON fixture once, then replay.

```js
import nock from 'nock';

nock.back.fixtures = new URL('./__nock-fixtures__', import.meta.url).pathname;
nock.back.setMode(process.env.NOCK_BACK_MODE ?? 'dryrun'); // 'record' locally, 'lockdown' in CI

const { nockDone } = await nock.back('users.json', {
  // drop cookies before the fixture is written
  afterRecord: (defs) => defs.map(({ rawHeaders, ...def }) => {
    const { 'set-cookie': _drop, ...headers } = rawHeaders ?? {};
    return { ...def, rawHeaders: headers };
  }),
});
const user = await (await fetch('http://localhost:4599/users/1')).json();
nockDone();
```

- **How it records:** in-process; `afterRecord` lets you scrub what's recorded.
- **Where it runs:** Node only (Nock 15: Node ≥20.12.1, ESM-only).
- **Storage format:** a JSON array of Nock definitions per fixture.
- **Matching:** host, method, path and body. Request headers aren't recorded by default.
- **Re-record workflow:** `update` re-records, `record` adds what's missing, `lockdown` replays and blocks the rest (all tested with `fetch` and axios). Unmatched requests to a recorded host got a **501**.
- **Maintenance:** 15.0.1, 2026-10-06; ~6.3M weekly downloads.
- **Best for:** Node services and libraries.
- **Limits:** no browser or React Native; modes are managed via env var; no HAR import.

See [Nock](/tools/nock/) and [MSW vs Nock](/comparisons/msw-vs-nock/).

### MSW + recorded fixtures/HAR

MSW has **no built-in recorder** (none in msw 3.0.3's exports or docs), but it can replay captured traffic. This loader replayed a Polly HAR in our MSW 3 test:

```js
import fs from 'node:fs';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

function handlersFromHar(file) {
  const { log } = JSON.parse(fs.readFileSync(file, 'utf8'));
  return log.entries.map(({ request, response }) =>
    http[request.method.toLowerCase()](request.url, () =>
      new HttpResponse(response.content.text, {
        status: response.status,
        headers: { 'content-type': response.content.mimeType },
      })));
}
const server = setupServer(...handlersFromHar('./recordings/users.har'));
server.listen({ onUnhandledFrame: 'error' });
```

The official `@mswjs/source` 0.5.0 has `fromTraffic(har)` and declares `msw ^2.10.0`. It worked with msw 2.15.0, but failed to import with 3.0.3 (`no export named 'cleanUrl'`).

- **How it records:** it doesn't. Capture with another tool (Playwright, DevTools, Polly).
- **Where it runs:** Node, browser, Storybook; MSW 3 needs Node ≥22.12.
- **Storage format:** your choice.
- **Matching:** your handlers. This is the most flexible option.
- **Re-record workflow:** re-capture with your other tool.
- **Maintenance:** 3.0.3, 2026-10-10; ~23M weekly downloads.
- **Best for:** teams already on MSW.
- **Limits:** no recorder; `@mswjs/source` isn't MSW 3-ready; `@msw/react-native` is a 404 on npm (2026-10-15).

See [MSW](/tools/msw/).

### Playwright `routeFromHAR`

Record/replay for browser E2E is built into Playwright:

```ts
await page.routeFromHAR('./hars/users.har', {
  url: '**/users/**',
  update: !!process.env.UPDATE_HAR, // record when set, replay otherwise
  notFound: 'abort',                // fail requests missing from the HAR
});
```

- **How it records:** `update: true` writes live traffic into the HAR (`recordHar` also works).
- **Where it runs:** browser pages in Playwright tests, not SSR or Node test runners.
- **Storage format:** HAR; in our run, the bodies went into sidecar files (`updateContent`).
- **Matching:** URL and method strictly, plus the POST payload; ties go to the most matching headers.
- **Re-record workflow:** re-run with `UPDATE_HAR=1`. Our replay returned the recorded body after the API changed.
- **Maintenance:** 1.64.1, 2026-10-14.
- **Best for:** E2E suites.
- **Limits:** requests handled by a Service Worker aren't served from the HAR (use `serviceWorkers: 'block'`); browser traffic only.

See [Playwright](/tools/playwright/).

### Talkback

An HTTP proxy that records "tapes"; point any app at it.

```js
import talkback from 'talkback';
const { RecordMode, FallbackMode } = talkback.Options;

const server = talkback({
  host: 'https://api.example.com',
  port: 5544,
  path: './tapes',
  record: process.env.CI ? RecordMode.DISABLED : RecordMode.NEW,
  fallbackMode: FallbackMode.NOT_FOUND,
  ignoreHeaders: ['content-length', 'host', 'authorization'],
});
await server.start();
```

- **How it records:** `NEW` records misses, `OVERWRITE` always re-records, `DISABLED` only replays.
- **Where it runs:** a Node process; the client can be anything.
- **Storage format:** one JSON5 tape per request, with readable bodies.
- **Matching:** method, URL, headers (minus `ignoreHeaders`) and body, with custom matcher hooks.
- **Re-record workflow:** `OVERWRITE`, or delete tapes. `DISABLED` replayed, with a **404** for unknown paths; ignored headers weren't saved.
- **Maintenance:** 4.2.0, 2024-07-10; last push 2024-08-31.
- **Best for:** polyglot stacks.
- **Limits:** no release in two years; needs a base-URL switch and an extra process.

### Proxay

A record/replay proxy from Airtasker, with YAML tapes.

```bash
npx proxay --mode record --host https://api.example.com --tapes-dir ./tapes --redact-headers authorization
npx proxay --mode replay --tapes-dir ./tapes
```

- **How it records:** as a proxy: `record`, `replay`, `passthrough`.
- **Where it runs:** a Node CLI; any client.
- **Storage format:** YAML tapes; `--redact-headers` stored `XXXX`.
- **Matching:** best-effort, or `--exact-request-matching`.
- **Re-record workflow:** record a fresh tape. Unknown paths returned a **500** in replay.
- **Maintenance:** commits through 2026-10-15 and a GitHub v2.0.0 release (2026-01-29), but npm's latest is 1.9.0 (2024-05-15).
- **Best for:** proxy recording with redaction.
- **Limits:** v2 isn't on npm; 87 stars.

### test-proxy-recorder

A new Playwright recorder: proxy for SSR, HAR for the browser. Not run by us.

- **How it records:** `record`, `replay` and `transparent` modes, set per test (one mode at a time).
- **Where it runs:** Playwright, with Next.js and TanStack Start SSR (per its docs).
- **Storage format:** `.mock.json` plus HAR.
- **Matching:** method, path and a query-string hash; repeats replay in recorded order.
- **Re-record workflow:** re-run in record mode.
- **Maintenance:** 1.4.1, 2026-10-13; one maintainer; created November 2025.
- **Best for:** SSR E2E suites where `routeFromHAR` misses the server calls.
- **Limits:** ~263 weekly downloads; its comparison table is a vendor claim.

### WireMock and Mockoon (record modes)

Out-of-process mock servers that can learn from real traffic. Not run by us.

- **How they record:** WireMock proxies and records (or snapshots) stub mappings. Mockoon's desktop app records one route per method and path, with proxy mode.
- **Where they run:** WireMock is Java (JAR, Docker, npm wrapper); Mockoon is a desktop app or CLI. Both serve any language.
- **Storage format:** WireMock JSON mappings; a Mockoon environment file.
- **Matching:** WireMock matchers (JSON bodies use `equalToJson`); Mockoon route rules.
- **Re-record workflow:** WireMock: record again; Mockoon: delete the route first.
- **Maintenance:** WireMock 3.13.2 (2025-11-14), with 4.0 betas through 2026-10-07; Mockoon 9.9.0 (2026-09-16).
- **Best for:** shared mock servers: a GUI (Mockoon), or stateful scenarios (WireMock).
- **Limits:** heavier than in-process libraries; Mockoon doesn't update recorded routes.

See [WireMock](/tools/wiremock/) and [Mockoon](/tools/mockoon/).

### Mockifyer

*Disclosure: Mockifyer is built and maintained by Sebastian Gedda, who also runs devxtools.dev.*

Record/replay for `fetch` and axios, with editable JSON, scenarios and date control. In a fresh project, this recorded and replayed only with the env var shown:

```js
// run with MOCKIFYER_RECORD_DEFAULT_ALWAYS_USE_REAL_API=false; set MOCKIFYER_SCENARIO or recordings land in the 24h `_scratch` bucket
import { setupMockifyer } from '@sgedda/mockifyer-fetch';

const record = process.env.MOCKIFYER_RECORD === 'true';
setupMockifyer({
  mockDataPath: './mock-data',
  useGlobalFetch: true,               // patch global fetch in Node
  recordMode: record,
  failOnMissingMock: !record,         // CI: throw on unrecorded requests
  domainPathRulesMode: 'record_all',  // default 'allowlist' records nothing until you enable paths
});
```

- **How it records:** patches `fetch`, or uses axios interceptors (axios needed `useGlobalAxios: true` in ESM).
- **Where it runs:** Node and React Native/Expo (per its docs; we didn't run React Native).
- **Storage format:** one JSON file per request in `mock-data/<scenario>/`; `authorization` was saved as `***`.
- **Matching:** method + URL, with optional header and query rules.
- **Re-record workflow:** record into a new scenario, then `git diff`. Scenarios, hand edits, `getCurrentDate()` and cross-service request IDs worked.
- **Maintenance:** core 1.10.181, 2026-09-30.
- **Best for:** React Native/Expo and multi-service apps.
- **Limits:**
  - ~207 weekly downloads, 2 stars, essentially one maintainer.
  - Young (March 2025); `CHANGELOG.md` stops at 1.4.0.
  - `fetch` and axios only.
  - Surprising defaults: no recording without `record_all`, and recordings kept using the live API until `MOCKIFYER_RECORD_DEFAULT_ALWAYS_USE_REAL_API=false` was set.
  - The MCP server isn't on npm.

See [Mockifyer](/tools/mockifyer/) and the [React Native mocking guide](/guides/mock-api-react-native/).

### Legacy VCR ports to avoid

VCR (Ruby, 2010) named the "cassette" pattern. Its JS ports have stalled:

| Package | Last release | Weekly DL |
|---|---|---|
| replay | 2018-11-30 | ~3.2K |
| fetch-vcr | 2020-01-23 | ~2.4K |
| yakbak | 2021-12-13 | ~1.2K |
| sepia | 2016-12-06 | ~400 |
| axios-vcr | 2019-09-17 | ~340 |
| node-vcr | 2019-07-03 | ~160 |
| node-recorder | 2019-04-19 | ~30 |

## Why Mockifyer exists

*Maintainer's perspective. Mockifyer is built and maintained by Sebastian Gedda, who also runs devxtools.dev.*

I started Mockifyer in March 2025 for two problems the recorders above didn't solve for me.

The first was a **React Native app with a backend**. I wanted to record the app's real `fetch` traffic once, keep it in the repo as one readable JSON file per request, and switch between named scenarios ("checkout error", "empty state") without rebuilding. In development, Mockifyer writes recordings to the device and, through a Metro middleware, into the project's `mock-data` folder. Release builds can load bundled mocks. The app and a Node backend can also share one store through the optional dashboard proxy, backed by Redis.

The second was **logging across several services**. When a gateway calls one service, which calls another, I wanted to see the whole chain. Mockifyer assigns an `X-Mockifyer-Request-Id` to each hop, passes the parent ID and the client "lane" header downstream, and the dashboard can show the trace.

Date control (`getCurrentDate()`) came from the same apps: recorded data with timestamps needs a fixed "now".

What it doesn't try to be: a Node-wide interceptor for every HTTP client, a browser E2E tool, or a mature project with a big community. If you're in Node only, use nock.back. For browser E2E, use Playwright's HAR. For a polyglot proxy, use Talkback or WireMock.

## Migrating from Polly.js

| Polly.js | nock.back | Talkback | Playwright HAR | Mockifyer* |
|---|---|---|---|---|
| `mode: 'record'` | `update` / `record` | `OVERWRITE` / `NEW` | `update: true` | `recordMode: true` |
| `replay` + `recordIfMissing: false` | `lockdown` | `DISABLED` | `notFound: 'abort'` | `failOnMissingMock` |
| `passthrough` | `wild` | no tapes | no HAR route | `activationMode: 'off'` |
| `recordingsDir` | `nock.back.fixtures` | `path` | HAR path | `mockDataPath` |
| `matchRequestsBy` | `before`, scope filters | `ignoreHeaders`, matchers | URL glob | `requestMatching` |
| `beforePersist` (scrub) | `afterRecord` | `tapeDecorator` | edit HAR | `anonymizeHeaders` |

\*Mockifyer is built and maintained by Sebastian Gedda, who also runs devxtools.dev.

Two things to watch. Polly matches on request **order** by default (`order: true`), so check suites where repeated identical calls return different responses. And Polly writes HAR, so your existing recordings can feed MSW handlers (see above).

## Which should you choose?

| Your situation | Good fit | Why |
|---|---|---|
| Node-only tests | nock.back | Most-used maintained recorder |
| Browser E2E | Playwright `routeFromHAR` | Built in |
| Next.js/SSR E2E | test-proxy-recorder | Covers server calls (young project) |
| Polyglot, or no process patching | Talkback, Proxay, WireMock | Any language |
| Already on MSW | MSW + HAR loader | One mocking layer |
| Want a GUI mock server | Mockoon | Record, then edit in the app |
| React Native/Expo with JSON scenarios | Mockifyer* | Device + repo sync via Metro (small project) |
| Polly suites that pass today | Stay for now | Pin versions, replay-only CI |

\*Mockifyer is built and maintained by Sebastian Gedda, who also runs devxtools.dev.

## FAQ

### Is Polly.js still maintained?
It's not archived or deprecated, but `@pollyjs/core` hasn't had a release since 2023-07-20. The last commit, on 2025-05-31, shipped `adapter-fetch` 6.0.7.

### What is the best alternative to Polly.js?
It depends on where your requests run: nock.back for Node, `routeFromHAR` for browser E2E, or a proxy (Talkback, WireMock) for any language.

### Is there a VCR library for JavaScript / Node.js?
Yes: nock.back, Talkback and Proxay use the cassette pattern. Direct ports (node-vcr, sepia, yakbak) haven't had a release since 2021.

### How do I record and replay HTTP requests in Node.js?
Use `nock.back`: set a fixtures directory, record once, then run `lockdown` in CI. It covers `fetch`, axios and `http`.

### How does nock.back record requests?
It records around your test, writes a JSON fixture on `nockDone()`, and loads it as interceptors next time. Modes: `wild`, `dryrun` (default), `record`, `update`, `lockdown`.

### Can MSW record real API responses?
No. Capture the traffic elsewhere and load it into handlers. `@mswjs/source`'s `fromTraffic` currently works with MSW 2 only.

### What is Mockifyer and who maintains it?
An MIT-licensed record/replay library for `fetch` and axios in Node and React Native. Mockifyer is built and maintained by Sebastian Gedda, who also runs devxtools.dev.

### How do I record API responses in React Native?
Patch `fetch` in dev builds (Mockifyer does this via Metro) or use a proxy like Talkback. See our [React Native guide](/guides/mock-api-react-native/). Disclosure: Mockifyer is built and maintained by Sebastian Gedda, who also runs devxtools.dev.

## Related

[Polly.js](/tools/pollyjs/) · [Nock](/tools/nock/) · [MSW](/tools/msw/) · [Playwright](/tools/playwright/) · [WireMock](/tools/wiremock/) · [Mockoon](/tools/mockoon/) · [Mockifyer](/tools/mockifyer/)\* · [Mirage JS](/tools/miragejs/) · [MSW vs Nock vs Polly](/comparisons/msw-vs-nock-vs-polly/) · [MSW vs Nock](/comparisons/msw-vs-nock/) · [Mocking & test data tools](/mocking-test-data/) · [All comparisons](/comparisons/)

\*Mockifyer is built and maintained by Sebastian Gedda, who also runs devxtools.dev.

---

## Sources (checked 2026-10-15)

- npm registry (versions, release dates, licences, engines): https://registry.npmjs.org/@pollyjs/core, /nock, /msw, /talkback, /proxay, /test-proxy-recorder, /@sgedda/mockifyer-core (Mockifyer: see disclosure), /@mswjs/source, /@playwright/test, /@mockoon/cli
- npm downloads, 2026-10-06 to 2026-10-12: https://api.npmjs.org/downloads/point/2026-10-06:2026-10-12/{package}
- Polly.JS repo, commits and docs (modes, `matchRequestsBy`, `beforePersist`): https://github.com/Netflix/pollyjs · https://netflix.github.io/pollyjs/
- Nock README (Nock Back modes, `afterRecord`) and v15.0.1 release: https://github.com/nock/nock · https://github.com/nock/nock/releases/tag/v15.0.1
- MSW v3.0.0 release notes: https://github.com/mswjs/msw/releases/tag/v3.0.0 · `@mswjs/source`: https://github.com/mswjs/source
- Playwright: https://playwright.dev/docs/mock#replaying-from-har · https://playwright.dev/docs/api/class-page#page-route-from-har
- Talkback README: https://github.com/ijpiantanida/talkback
- Proxay README and releases: https://github.com/airtasker/proxay/releases
- test-proxy-recorder docs: https://test-proxy-recorder.dev/docs/getting-started/how-it-works/
- WireMock record and playback: https://wiremock.org/docs/record-playback/ · releases: https://github.com/wiremock/wiremock/releases
- Mockoon auto-mocking and recording: https://mockoon.com/docs/latest/logging-and-recording/auto-mocking-and-recording/
- Mockifyer repo (README, REACT_NATIVE.md, MOCKIFYER_INITIALIZATION.md, multi-service example): https://github.com/sgedda/mockifyer (Mockifyer is built and maintained by Sebastian Gedda, who also runs devxtools.dev.)
- VCR (Ruby): https://github.com/vcr/vcr
- Our runs: Node 22.23.3, 2026-10-15, against a local test API. Versions are listed at the top of this page.
