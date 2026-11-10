---
title: "Keploy and Mockifyer: When to Use Which"
description: "Keploy records backend traffic and replays it as API regression tests. Mockifyer records fetch/axios calls inside a JS or React Native app. When to use each, and both."
slug: "/guides/keploy-and-mockifyer/"
canonical: "https://devxtools.dev/guides/keploy-and-mockifyer/"
h1: "Keploy and Mockifyer: When to Use Which"
primary_keyword: "keploy vs mockifyer"
breadcrumbs: [{ name: "Home", url: "/" }, { name: "Guides", url: "/guides/" }, { name: "Keploy and Mockifyer", url: "/guides/keploy-and-mockifyer/" }]
schema: ["TechArticle", "BreadcrumbList", "FAQPage"]
author: "DevX Tools"
datePublished: "2026-11-10"
dateModified: "2026-11-10"
tested_with: "Mockifyer: @sgedda/mockifyer-core 1.10.190, -fetch 1.8.106, -axios 1.10.35, axios 1.x on Node 24.22.1 against a local test API, 2026-11-10. Keploy: record + test passed on Linux (native OSS CLI, no account, no Docker) against v3.6.229, 2026-11-10; docs, README, pricing page and GitHub API also checked 2026-11-10 against v3.6.229."
tools: ["keploy", "mockifyer"]
affiliation: "Mockifyer is built and maintained by Sebastian Gedda, who also runs devxtools.dev. Keploy was added to the catalog at the Keploy team's request (PR #89); we have no commercial ties to Keploy."
---

> **Disclosure:** devxtools.dev is run by Sebastian Gedda, who also wrote and maintains **Mockifyer**, one of the two tools on this page. Keploy is listed first and gets equal or more space, and we say plainly where it is the stronger tool. We have no affiliate links and no commercial ties to Keploy. We ran `keploy record` and `keploy test` on Linux with the open-source CLI v3.6.229 (tiny Node HTTP app, no account). Other Keploy facts come from its docs, README and pricing page. Mockifyer details were re-tested by us on 2026-11-10 unless marked "per docs".


**Keploy and Mockifyer aren't really alternatives. They record traffic at different layers.** [Keploy](/tools/keploy/) wraps your **backend service** and turns the requests it receives, plus the database, queue and API calls it makes, into regression tests with mocks. [Mockifyer](/tools/mockifyer/) runs **inside a JavaScript client**, such as a React Native/Expo app or a Node service, and records the `fetch` and axios calls that client makes. If you have a mobile app and a backend, you may want one of each.

> **Checked** 2026-11-10 against Keploy's docs, README, pricing page and GitHub, and Mockifyer's README, React Native docs and npm packages.

## TL;DR

- **Testing a backend API** (Go, Java, Node, Python and more) and its database and queue calls: use **Keploy**. It needs no SDK, it's mature (repo since January 2022, about 19.6k GitHub stars) and it has a documented CI flow.
- **Mocking what a JS client sees**, especially a **React Native/Expo app on a device or simulator**, or splitting traffic into per-client "lanes": **Mockifyer** (*built by this site's owner*) covers that. Keploy's docs don't cover React Native. Mockifyer is young and has sharp defaults, so read the caveats below first.
- **Both:** Keploy guards the backend's behaviour in CI. Mockifyer gives the app stable, offline responses for development and E2E.

## Where each one sits

```
 React Native / web app                 Backend service                 Dependencies
 ┌───────────────────────┐   HTTP    ┌─────────────────────┐        ┌──────────────────┐
 │ fetch / axios         │ ───────▶  │ your API (any lang) │ ─────▶ │ Postgres, MySQL, │
 │  ▲ Mockifyer patches  │           │  ▲ Keploy captures  │        │ Mongo, Kafka,    │
 │    calls here         │           │    in + out here    │        │ 3rd-party APIs   │
 └───────────────────────┘           └─────────────────────┘        └──────────────────┘
```

- **Keploy** captures at the socket level: with eBPF in the kernel on Linux, and in user space on macOS and Windows (per Keploy's "How Keploy works" docs). It needs no code changes or SDK.
- **Mockifyer** is an npm library. You call `setupMockifyer` (Node) or `setupMockifyerForReactNative` (app), and it patches `fetch` or adds axios interceptors in that process.

## Quick decision table

| If you need… | Keploy | Mockifyer* |
|---|---|---|
| Regression tests for an existing backend API, generated from real traffic | **Yes**, the core use case | No |
| Mocks for the database, cache and queue calls your service makes | **Yes**. Postgres, MySQL, MongoDB, Redis, Kafka and more on Linux/Docker (the open-source column of the pricing table lists fewer; see "Where Keploy wins") | No, HTTP (`fetch`/axios) only |
| Non-JS services (Go, Java, Python and others) | **Yes**, at the network layer | No, JS/TS only |
| Capture without adding an SDK or changing code | **Yes** | No, you add setup code |
| Mocked API responses inside a React Native/Expo app on a simulator or device | Not covered by its docs | **Yes**, per docs (Hybrid provider, Metro sync) |
| E2E scenarios picked at app launch (Detox/Maestro) | No | **Yes**, per docs (`scenario` launch argument) |
| Separate mock "lanes" per client, device or test run | No | **Yes** (client lanes via `X-Mockifyer-Client-Id`) |
| A trace of calls across several Node services | Not its focus | **Yes** (request IDs per hop, dashboard) |
| A documented CI flow, paid support, enterprise features | **Yes** | No; one maintainer |

\*Built and maintained by the owner of devxtools.dev.

## Keploy: backend API regression testing

Keploy runs your server under `keploy record`, captures the requests it receives and the calls it makes, and saves them as YAML test cases and mocks. `keploy test` starts the app again, replays the recorded requests, serves the dependency calls from the mocks, and compares the responses.

From Keploy's README and install docs:

```bash
# Install the CLI (Linux, macOS, WSL)
source /dev/stdin <<<"$(curl -fsSL https://keploy.io/install.sh || echo 'echo Keploy installer download failed >&2; return 1')"

# Record: run your app under Keploy and send it some traffic
keploy record -c "node server.js"

# Replay the recordings as tests, with dependencies mocked
keploy test -c "node server.js" --delay 10
```

Recordings land in a `keploy/` folder that you commit (per Keploy's docs):

```
keploy
└── test-set-0
    ├── mocks.yaml
    └── tests
        ├── test-1.yaml
        └── test-2.yaml
```

Keploy can also mock the dependencies of an **existing test suite** with `keploy mock record -c "<your test command>"` and `keploy mock replay -c "<your test command>"`. Its docs mention pytest, `go test` and jest. Your test runner's exit code is passed through, so it works in CI.

Things to know before you start (all per Keploy's docs):

- **macOS needs Apple Silicon** for the native CLI. Intel Macs use a Lima VM. On macOS and Windows, native mode understands HTTP/HTTPS, MySQL and MongoDB. PostgreSQL, Redis, Kafka and gRPC calls are "captured only as raw bytes and usually don't replay", so run those in Docker or on Linux/WSL. Linux needs kernel 5.10+.
- **On macOS, start the app directly** (`node server.js`, a built Go binary), not through a launcher such as `npm start`.
- **The open-source Linux CLI v3.6.229 ran `keploy record`/`keploy test` locally with no account.** In CI it signs in with a `KEPLOY_API_KEY` secret (per Keploy's GitHub CI docs).
- **Pricing:** the open-source core is Apache-2.0 and self-hosted. The free **Playground** plan has 30 test-suite generations and 100 test runs a month. **Pro** is $19/user/month billed yearly or $24 billed monthly, plus usage. **Enterprise** is custom. The pricing comparison table lists Kubernetes recording from Pro (shared with Enterprise). The same page's Enterprise card and FAQ, though, present "Record traffic inside Kubernetes" / "record-replay in Kubernetes clusters" as an Enterprise feature. The page disagrees with itself, so we can't say which tier actually includes it; ask Keploy if this matters for you. Production traffic capture is consistently Enterprise only.

### Where Keploy wins

- **Language coverage.** It works at the network layer, so it isn't tied to JavaScript. The pricing table lists Node, Go, Java and Python for the free and Pro tiers, and "all languages" for Enterprise. The README shows badges for many more.
- **Database and queue mocks.** It records and replays Postgres, MySQL, MongoDB, Redis, Kafka and more, not just HTTP. One caveat: the pricing table's open-source column lists MySQL as the only database and GraphQL as the only messaging protocol. Kafka appears from Playground up and RabbitMQ only on Enterprise, so check which tier covers your stack.
- **No SDK.** You don't change any code to start recording.
- **A mature CI flow.** It has documented GitHub Actions, GitLab and Jenkins setups, test reports and a `keploy/testgpt` GitHub Action.
- **Maturity and community.** The repo started in January 2022 and has about 19.6k stars, about 2,450 forks and about 140 contributors. Several releases shipped on 9–10 Nov 2026 alone (v3.6.226 to v3.6.229). It's in the CNCF Landscape, and there's commercial support.

## Mockifyer: record/replay inside a JS client

*Disclosure: Mockifyer is built and maintained by Sebastian Gedda, who also runs devxtools.dev.*

Mockifyer (MIT) records `fetch` and axios responses as one JSON file per request in your repo, under `mock-data/<scenario>/`, and replays them. It is built mainly for **React Native and Expo**. In development, its "Hybrid" provider writes mocks to the device **and** to the project's `mock-data/` folder through Metro endpoints. Release builds can load bundled mocks. It also runs in Node.

From Mockifyer's React Native docs (per docs; we didn't run it on a device for this page):

```typescript
import {
  setupMockifyerForReactNative,
  isMockifyerReactNativeActive,
} from '@sgedda/mockifyer-fetch';

export async function initializeMockifyer() {
  const recordMode = __DEV__ && process.env.MOCKIFYER_RECORD === 'true';
  if (recordMode) process.env.MOCKIFYER_RECORD_RESPONSES = 'true';

  const result = await setupMockifyerForReactNative({
    isDev: __DEV__,
    mockDataPath: 'mock-data',
    bundledDataPath: './assets/mock-data',
    recordMode,
    config: {
      logging: 'info',
    },
  });

  if (isMockifyerReactNativeActive(result)) {
    // result.instance.enableMockifyer() / disableMockifyer() / isMockifyerEnabled()
  }
}
```

`MOCKIFYER_MODE` controls when it activates. The modes are `on` (the default), `manual` (a runtime toggle), `launch_client` (only when a Detox/Maestro launch argument is present) and `off` (store builds).

### Where Mockifyer wins

- **On-device and JS-client work, especially React Native.** It mocks the app's own `fetch` calls on a simulator or device, syncs recordings back to the repo through Metro, and selects scenarios at launch for [Detox](/tools/detox/) and [Maestro](/tools/maestro/). Keploy's docs don't cover React Native. Its Chrome extension records a web app's browser traffic to generate API tests, but it doesn't serve mocks to the app.
- **Per-client lanes.** A client or lane ID, sent as `X-Mockifyer-Client-Id`, keeps each device, developer or CI run on its own scenario through the optional dashboard proxy.
- **Traffic logging across services.** Each hop gets an `X-Mockifyer-Request-Id`, and the parent ID passes downstream. The dashboard can show the chain. Cross-service request IDs worked in our [October tests](/comparisons/pollyjs-alternatives/).

### Mockifyer caveats (re-tested 2026-11-10)

We re-ran our October checks on the latest npm releases: core 1.10.190, fetch 1.8.106 and axios 1.10.35, on Node 24.22.1. They're still true, and one is new:

- **The README's basic setup records nothing.** `setupMockifyer({ mockDataPath, recordMode: true })` wrote no mock files.
- **`fetch` and axios need the global flags in Node.** Without `useGlobalFetch: true`, or `useGlobalAxios: true` for axios in ESM, nothing recorded.
- **New: response bodies aren't saved by default.** With `domainPathRulesMode: 'record_all'`, recordings stored the request with an empty response (`responsePending`) until we set `MOCKIFYER_RECORD_RESPONSES=true`.
- **Replay calls the live API by default.** New recordings get `alwaysUseRealApi: true`. Replay only served the recorded data once we also set `MOCKIFYER_RECORD_DEFAULT_ALWAYS_USE_REAL_API=false`.
- **Two packages named in the README aren't on npm.** `@sgedda/mockifyer-mcp` (you build it from the repo) and `@sgedda/mockifyer-test-helper` both return 404.
- **It's small.** It has 2 GitHub stars, about 177 weekly downloads of `@sgedda/mockifyer-core` (3–9 Nov), essentially one maintainer, and the repo dates from March 2025. It only handles `fetch` and axios, with no database or queue mocks.

With all four settings in place (`useGlobalFetch`/`useGlobalAxios`, `record_all`, `MOCKIFYER_RECORD_RESPONSES=true`, `MOCKIFYER_RECORD_DEFAULT_ALWAYS_USE_REAL_API=false`), fetch and axios each recorded once and then replayed the recording after the API changed.

## Use both: a React Native app with a backend

Say you have an Expo app that talks to a Node API backed by Postgres and a payments API.

1. **Backend, with Keploy.** Record the API with `keploy record` while you run through the app's main flows against a dev backend. Do this on Linux or in Docker, since Postgres doesn't replay natively on macOS. Commit `keploy/`, and run `keploy test` in CI on every backend PR. If someone changes a response shape the app depends on, the test fails before it ships. Postgres and the payments API are served from `mocks.yaml`, so CI needs neither.
2. **App, with Mockifyer.** In dev builds, record the app's `fetch` calls once against the same backend. Commit `mock-data/` with named scenarios (`happy`, `empty-cart`, `payment-declined`). Developers work offline against those scenarios, and Maestro or Detox launches the E2E build with `scenario: "payment-declined"`.
3. **Keep the two in step.** When a Keploy test fails because the API changed on purpose, re-record both: Keploy's tests and Mockifyer's app scenarios. To check formally that the app's mocks still match the API, add contract tests (see our [Pact guide](/guides/pact-contract-testing-javascript/)).

Neither tool replaces the other here. Keploy can't patch `fetch` inside the app, and Mockifyer can't mock the backend's Postgres calls.

## FAQ

### Is Mockifyer a Keploy alternative?
Not really. Keploy tests a backend service by recording its incoming requests and outgoing dependency calls. Mockifyer mocks the HTTP calls a JavaScript client makes. They overlap only for a Node process's outgoing HTTP calls, which both can record. For that case Keploy's `keploy mock` needs no code changes, while Mockifyer needs setup code. (Mockifyer is built by this site's owner.)

### Does Keploy work with React Native?
Keploy's docs don't cover React Native, and it doesn't patch `fetch` inside a mobile app. You can still use it on the backend your app calls. For in-app mocking, see our [React Native mocking guide](/guides/mock-api-react-native/).

### Is Keploy free?
The core is open source (Apache-2.0). The hosted Playground plan is free, with monthly limits. Pro costs $19/user/month billed yearly ($24 billed monthly) plus usage. The open-source CLI (v3.6.229) recorded and replayed tests locally with no account. Keploy's docs say the keploy.io installer and CI/cloud features need a free account.

### Which databases can Keploy mock?
Keploy's README lists Postgres, MySQL and MongoDB, plus Kafka and RabbitMQ for messaging. Its pricing table limits some of these by plan, and on native macOS or Windows only HTTP/HTTPS, MySQL and MongoDB replay reliably. Use Docker or Linux for the rest.

## Related

- [Keploy](/tools/keploy/) · [Mockifyer](/tools/mockifyer/) · [MSW](/tools/msw/) · [WireMock](/tools/wiremock/)
- [How to Mock APIs in React Native](/guides/mock-api-react-native/) · [Polly.js alternatives](/comparisons/pollyjs-alternatives/) · [Pact contract testing](/guides/pact-contract-testing-javascript/)
- [Record/replay and mocking tools in the catalog](/catalog/) · [Mocking & test data](/mocking-test-data/) · [Testing](/testing/)

## Sources

All accessed 2026-11-10.

- Keploy README (eBPF, no SDK, databases and queues, quick start): https://github.com/keploy/keploy/blob/main/README.md
- Keploy GitHub repo and releases (Apache-2.0, stars, forks, v3.6.226–v3.6.229): https://github.com/keploy/keploy and https://github.com/keploy/keploy/releases
- How Keploy works (eBPF on Linux, user space on macOS/Windows, YAML): https://keploy.io/docs/keploy-explained/how-keploy-works/
- Installing Keploy (Apple Silicon only on macOS, kernel 5.10+, native protocol limits, launcher caveat): https://keploy.io/docs/server/installation/
- Keploy test and mock layout (`keploy/test-set-0/…`): https://keploy.io/docs/server/sdk-installation/
- Mock your own tests (`keploy mock record/replay`, platforms): https://keploy.io/docs/running-keploy/mock-your-tests/
- Keploy GitHub CI (account and `KEPLOY_API_KEY`, `keploy/testgpt` action): https://keploy.io/docs/ci-cd/github/
- Keploy API Test Recorder (Chrome extension): https://keploy.io/docs/running-keploy/api-testing-chrome-extension/
- Keploy pricing (plans, $19/$24, tier table, Enterprise features): https://keploy.io/pricing
- Mockifyer README (packages, env vars, lanes, domain-path rules; maintained by the site owner): https://github.com/sgedda/mockifyer
- Mockifyer React Native docs (`setupMockifyerForReactNative`, `MOCKIFYER_MODE`, Hybrid provider): https://github.com/sgedda/mockifyer/blob/main/REACT_NATIVE.md
- npm registry: @sgedda/mockifyer-core 1.10.190, -fetch 1.8.106, -axios 1.10.35 (MIT); -mcp and -test-helper 404: https://registry.npmjs.org/@sgedda/mockifyer-core
- npm weekly downloads, @sgedda/mockifyer-core (2026-11-03 to 2026-11-09): https://api.npmjs.org/downloads/point/last-week/@sgedda/mockifyer-core
