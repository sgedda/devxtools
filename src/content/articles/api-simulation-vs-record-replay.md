---
title: "API Simulation vs Record & Replay (2026) | DevXTools"
description: "Recorded responses or a simulated API? Compare record/replay tools and API simulators for testing apps and AI agents, with when to use each."
slug: "/guides/api-simulation-vs-record-replay/"
canonical: "https://devxtools.dev/guides/api-simulation-vs-record-replay/"
h1: "Simulators vs Recordings: Which Fake API Should You Test Against?"
primary_keyword: "api simulation vs record and replay"
secondary_keywords: ["api simulator", "record and replay api testing", "mock api for ai agent testing", "service virtualization vs mocking"]
breadcrumbs: [{ name: "Home", url: "/" }, { name: "Guides", url: "/guides/" }, { name: "API Simulation vs Record & Replay", url: "/guides/api-simulation-vs-record-replay/" }]
schema: ["TechArticle", "BreadcrumbList", "FAQPage"]
author: "DevX Tools"
datePublished: "2026-11-23"
dateModified: "2026-11-23"
tested_with: "Mockifyer only: @sgedda/mockifyer-core 1.10.197 and -fetch 1.8.107 on Node 24.22.1 against a local test API, 2026-11-23 (recordResponses allowlist record, then replay). Every other tool on this page: docs, release notes, pricing pages and GitHub/npm checked 2026-11-23; we did not run them for this page."
tools: ["pollyjs", "wiremock", "keploy", "mockifyer"]
affiliation: "devxtools.dev is run by Sebastian Gedda, who also builds and maintains **Mockifyer**, one of the recording tools on this page. We have no commercial ties to any other tool here and use no affiliate links."
---

**A recording replays traffic your own app really sent and received. A simulator is a stand-in built to behave like a vendor's API, with state.** That is the whole of the API simulation vs record and replay question. Recordings are the better fit for your own and long-tail APIs. Simulators are the better fit for popular vendors when you need behaviour over time, such as a subscription that renews. Many teams end up using both.

> **Checked** 2026-11-23 against each tool's docs, release notes, pricing page and GitHub or npm. We re-ran only Mockifyer for this page.

## TL;DR: when to record, when to simulate

- **Record** when the API is yours (a BFF, an internal service, a partner API) or when no maintained simulator exists. You get the exact shapes your code depends on, odd fields included.
- **Simulate** when you integrate with a big vendor (AWS, Stripe, Slack, GitHub) and need state, failures or a clock you control, without a real account.
- **For AI agents**, a simulator gives the agent a world it can change safely. Recordings give it the same responses your app sees in production. Neither one makes the model deterministic.
- **Keep both honest** with re-recording, contract tests or an OpenAPI spec. Fakes go stale.

## What a recording is (and what it is not)

Record and replay API testing works like this: you send real traffic once, through a proxy or an in-process interceptor, save each request and response to a file, and serve those files back on later runs without calling the live API. Polly.js saves HAR files. WireMock and MockServer save stub mappings or "expectations" as JSON. Keploy saves YAML test cases and mocks.

A recording is **not a model of the API**. It answers the requests it has seen, in the order and shape it saw them. Ask it for something new, such as a different user ID or a write followed by a read, and it either misses, calls the live API, or returns a stale answer, depending on the tool's settings. Some tools can turn a sequence of repeated calls into simple states (WireMock's "repeats as scenarios"), but none infer business rules.

## What an API simulator is (stateful fakes, emulators, templated responses)

An API simulator speaks a vendor's API and keeps state between calls: create a customer, then fetch it, and it is there. Good ones also let you seed data, inject faults or move a virtual clock. They come in three broad kinds:

- **Emulators** generated from or written against the vendor's API model, such as AWS Emulator.
- **Hand-built stateful fakes** of specific workflows, such as Localhost2137's Slack and Stripe plugins or StripeWorld.
- **Templated mocks** that match on the request and build the response from it, sometimes with state, such as WireMock Templates.

"Service virtualization" is the older enterprise name for the same idea. Tools in that space usually support both recording and simulation.

## Simulators vs recordings at a glance

| | Recordings | Simulators |
|---|---|---|
| **Fidelity** | Exact for the calls you recorded; nothing beyond them | Broad but approximate; coverage is partial and tool-specific |
| **State** | None, or simple sequences | Yes: writes are visible to later reads |
| **Drift** | Goes stale when the real API changes; re-record or check against live | Depends on the maintainer keeping up with the vendor |
| **Setup effort** | Low: run your code once against the real API | Low if one exists for your vendor; high to build your own |
| **CI speed** | Fast, local files | Fast if local; hosted ones add network latency and rate limits |
| **Offline use** | Yes, once recorded | Local ones yes; hosted ones no |
| **Your own or long-tail APIs** | Yes | Rarely: nobody maintains a simulator of your BFF |
| **AI-agent fit** | Good for read paths and replaying a known trace | Better for agents that write, retry and act over many steps |

## Recording tools compared

All five record real traffic and replay it. They differ in where they sit and what they capture.

- **[Polly.js](/tools/pollyjs/)** (Netflix, Apache-2.0): a JavaScript library for Node and the browser with `record`, `replay` and `passthrough` modes, `recordIfMissing`, and recordings saved as HAR. **Where it wins:** it works in the browser as well as Node, and `expiresIn` with `expiryStrategy` warns about, fails on or re-records old recordings, which helps against stale fixtures. **Watch for:** `@pollyjs/core` was last released as 6.0.6 in July 2023, and the repo's last push was in May 2025. Our [Polly.js alternatives](/comparisons/pollyjs-alternatives/) and [MSW vs Nock vs Polly.js](/comparisons/msw-vs-nock-vs-polly/) pages go deeper.
- **[MockServer](https://www.mock-server.com/proxy/record_and_replay.html)** (Apache-2.0, Java, runs as a proxy or Docker image, with clients in several languages): proxies live traffic and returns recorded expectations as JSON or Java. **Where it wins:** streamed responses. It records server-sent events and chunked bodies with their chunk timing, and its `record_llm_fixtures` MCP tool turns recorded SSE into replayable fixtures. Version 9.3.0 (15 November 2026) added opt-ins for streams that are cut off or still open when MockServer stops; the current release is 9.4.0 (20 November 2026). It is language-agnostic and also offers stateful scenarios.
- **[Keploy](/tools/keploy/)** (Apache-2.0): captures a backend's incoming API calls and its outgoing dependency calls at the network layer, without an SDK, and turns them into test cases and mocks, including databases and queues. Latest release v3.7.16 (22 November 2026). For the details and how it pairs with an in-app recorder, see our guide on [recording backend traffic as regression tests](/guides/keploy-and-mockifyer/).
- **[WireMock record mode](/tools/wiremock/)** (Apache-2.0, Java, standalone or Docker): proxies to the real API and records stub mappings, either live ("recording") or after the fact ("snapshotting"). **Where it wins:** recorded stubs drop straight into WireMock's request matching, response templating and fault simulation, and "repeats as scenarios" captures simple state. The latest stable release is 3.13.2 (November 2025); 4.0 is in beta (4.0.0-beta.44, 17 November 2026).
- **[Mockifyer](/tools/mockifyer/)** (MIT): an in-process library that records `fetch` and axios calls in Node.js and React Native/Expo to JSON files in your repo, with scenarios, client lanes and a drift check. **Where it wins:** on-device React Native and Expo recording, and per-client lanes. **Watch for:** recording needs `useGlobalFetch: true` (or `useGlobalAxios`). As of core 1.10.197 (16 November 2026), a `recordResponses` allowlist saves bodies only for the hosts or URL patterns you list, and those replay at once; other requests are saved as request-only stubs that still call the live API. `MOCKIFYER_RECORD_RESPONSES=true` captures everything. It does not record SSE or chunked timing yet (a pull request is open), and its MCP server is in the repo but not on npm. It is young and JS/TS only.

**In short:** Polly.js for browser and Node JS tests, MockServer for streamed and LLM traffic in any language, Keploy for backend regression tests, WireMock if you already use WireMock or the JVM, and Mockifyer for React Native apps or lanes.

## Simulators compared

- **[AWS Emulator](https://github.com/aws/aws-emulator)** (AWS, CC0-1.0, generally available 11 November 2026): a local emulator of the AWS APIs. Point the AWS SDK or CLI at it; no AWS account or deployment needed. Services are generated from AWS's published API models. State lives in memory, and each copy gets its own port, keys and state. Operations it doesn't support yet return `501 Not Implemented`, and each release publishes fidelity scores. No extra fee.
- **[WireMock Templates](https://www.wiremock.io/sandboxes)** (WireMock, hosted): ready-made simulations of third-party APIs. The catalogue lists 143 templates across 29 vendors, including Stripe, OpenAI, Anthropic, GitHub and Okta. Public sandboxes need no login or key; you change the base URL. Some keep state (the Stripe template remembers customers and refunds); others return fixed sample data. The public endpoints are shared and rate-limited, so use your own WireMock Cloud copy for CI. WireMock says templates imply no vendor endorsement.
- **[Localhost2137](https://localhost2137.dev/)** *(early-stage, third-party)*: a local runtime for service emulators, with official Slack and Stripe plugins, a virtual clock and an isolated state per test. It needs Node.js 24+ and pnpm. Each plugin covers specific documented workflows only. Its GitHub repo is new, with no licence declared, and the npm package is at 0.0.1.
- **[StripeWorld](https://github.com/Kiln-AI/stripe_world)** *(demo project, not affiliated with Stripe)*: a stateful copy of Stripe's Billing and Payments API for agent evals, reinforcement learning and tests, built as a demo of Kiln AI's Seahaven framework (MIT). It covers 155 operations pinned to one Stripe API version, but not all of Stripe, and it doesn't deliver webhooks (events can be queried instead).
- **[Rystic](https://www.rystic.ai/simulators)** *(early-stage startup, commercial)*: local single-binary simulators of 20-plus APIs, including Slack, GitHub, Stripe and S3, with settable state and fault and latency injection. It publishes a fidelity score per simulator (Slack: 95.0% of 884 checks). Free covers GitHub, Linear and Slack for 10 hours a month with sign-up; Pro is $89.99 per seat per month.
- **[Plurai simulation](https://www.plurai.ai/blog/how-plurai-tests-real-agents-in-simulated-worlds)** *(commercial, launched 11 November 2026)*: not an API simulator for one vendor, but a tool that builds a simulated world around your own agent: mocked tools that share one state per scenario, simulated users and evals. It runs as a plugin for Claude Code, Codex and GitHub Copilot, with a hosted backend.

## Testing AI agents against a fake API

Agents make the choice harder in four ways:

- **Non-determinism.** The model may phrase the same tool call differently each run. Recordings that match on the exact request body miss; loosen matching or use a simulator that understands the API.
- **Tool calls change the world.** An agent that refunds a charge expects the next lookup to show the refund. Only a stateful fake can show that; a recording replays what happened last time.
- **Side effects.** Never let an agent loose on live payments or email. A local simulator, or a recording with no live fallback, keeps it contained. Shared public sandboxes need placeholder keys and no real data.
- **Rate limits and failures.** Test what the agent does on a 429 or a timeout. Simulators with fault injection and mock servers like WireMock and MockServer can return those on demand.

A mock API for AI agent testing should also be resettable between runs, so each eval starts from a known state.

## Keeping fakes in step with the real API

Every fake drifts. Plan for it:

- **Re-record on a schedule**, and use expiry where the tool has it (Polly.js `expiresIn`).
- **Compare recordings with the live API.** Mockifyer has a drift check that compares recorded mocks with the live API, and Keploy re-runs recorded tests against your service.
- **Contract tests** catch drift between services you own. See our [Pact contract testing guide](/guides/pact-contract-testing-javascript/).
- **Generate or validate against OpenAPI.** See [OpenAPI mock servers with Prism](/guides/openapi-mock-server-prism/).
- **For simulators**, read the maintainer's fidelity report (AWS Emulator, Rystic) or verification method (WireMock checks templates against recorded live traffic), and pin the version you test against.

## Which should you choose?

- **Frontend or React Native app calling your own BFF:** record. Polly.js for browser and Node tests, Mockifyer for on-device React Native. See [How to mock APIs in React Native](/guides/mock-api-react-native/).
- **Node service calling third-party HTTP APIs:** record with Polly.js, MockServer or Mockifyer, or simulate the vendor if a maintained simulator exists.
- **Backend regression tests, including databases and queues:** record with Keploy.
- **Code that uses the AWS SDK:** simulate with AWS Emulator, and check its fidelity report for the services you use.
- **Payments:** a stateful Stripe simulator (WireMock's Stripe template, StripeWorld or Rystic) for renewals and declines, plus recordings of your own payment service.
- **AI agent that writes, retries or acts over many steps:** a stateful simulator, or an agent-simulation tool such as Plurai. Use recordings or MockServer fixtures for streamed LLM responses.

## FAQ

### What is the difference between API mocking, recording and simulation?
Mocking is the umbrella term: anything that answers in place of the real API. A hand-written mock returns what someone wrote. A recording returns what the real API returned when you captured it. A simulator models the API's behaviour and state, so it can answer requests nobody recorded.

### Are recorded API responses enough for regression testing?
For read paths and your own APIs, often yes: they are fast, offline and exact. They are not enough when the test depends on state changing across calls, or once the real API has changed since you recorded. Re-record or add a drift or contract check.

### When should I use an emulator instead of recorded responses?
When a maintained emulator exists for the vendor and your test needs state, faults or time: an S3 object you just wrote, a subscription renewal, a declined card. Check its coverage first; AWS Emulator, for example, returns 501 for operations it doesn't support yet.

### How do I test an AI agent without calling real APIs?
Point the agent's tools at a local or sandboxed fake by changing the base URL, use placeholder keys, and reset state between runs. Use a stateful simulator for actions and recordings or fixtures for read-only and streamed responses. Keep the evals on the final state, not just the transcript.

### How do I stop recordings from going stale?
Re-record on a schedule, expire old recordings where the tool supports it, run a drift check against the live API in CI, and add contract tests for APIs you own.

### Is service virtualization the same as an API simulator?
Mostly. Service virtualization is the older, enterprise term for standing in for a dependency you can't easily call in testing, and its tools usually offer both recording and simulation. "API simulator" is the newer term, often used for stateful stand-ins of popular vendor APIs.

## Related

- [Keploy and Mockifyer: when to use which](/guides/keploy-and-mockifyer/) · [Polly.js alternatives](/comparisons/pollyjs-alternatives/) · [MSW vs Nock vs Polly.js](/comparisons/msw-vs-nock-vs-polly/) · [MSW vs Nock](/comparisons/msw-vs-nock/)
- [Polly.js](/tools/pollyjs/) · [WireMock](/tools/wiremock/) · [Keploy](/tools/keploy/) · [Mockifyer](/tools/mockifyer/) · [Mocking & test data](/mocking-test-data/)

## Sources

All accessed 2026-11-23.

- Polly.js README and configuration docs (modes, `recordIfMissing`, `expiresIn`, `expiryStrategy`, HAR): https://github.com/Netflix/pollyjs and https://netflix.github.io/pollyjs/#/configuration
- npm registry, @pollyjs/core 6.0.6 (2023-07-20) and @pollyjs/adapter-fetch 6.0.7 (2025-05-31), Apache-2.0: https://registry.npmjs.org/@pollyjs/core
- MockServer record and replay docs: https://www.mock-server.com/proxy/record_and_replay.html
- MockServer releases 9.3.0 (2026-11-15) and 9.4.0 (2026-11-20), Apache-2.0: https://github.com/mock-server/mockserver-monorepo/releases
- Keploy GitHub repo and releases (Apache-2.0, v3.7.16): https://github.com/keploy/keploy/releases
- WireMock record and playback docs (recording, snapshotting, repeats as scenarios): https://wiremock.org/docs/record-playback/
- WireMock releases (3.13.2 stable, 4.0.0-beta.44), Apache-2.0: https://github.com/wiremock/wiremock/releases
- Mockifyer README (`useGlobalFetch`, `recordResponses`, `MOCKIFYER_RECORD_RESPONSES`, scenarios, client lanes, drift check, MCP): https://github.com/sgedda/mockifyer
- npm registry, @sgedda/mockifyer-core 1.10.197 and -fetch 1.8.107 (MIT): https://registry.npmjs.org/@sgedda/mockifyer-core
- Mockifyer pull request #564, SSE/chunked recording (open): https://github.com/sgedda/mockifyer/pull/564
- AWS Emulator announcement (11 Nov 2026): https://aws.amazon.com/about-aws/whats-new/2026/11/aws-emulator-now-available/
- AWS Emulator GitHub repo (README, CC0-1.0, releases): https://github.com/aws/aws-emulator
- WireMock Templates catalogue: https://www.wiremock.io/sandboxes
- WireMock Templates announcement (9 Nov 2026): https://www.wiremock.io/post/wiremock-templates-ai-agents
- Localhost2137 site and GitHub repo: https://localhost2137.dev/ and https://github.com/localhost2137/localhost2137
- StripeWorld README (MIT, Seahaven demo, not affiliated with Stripe): https://github.com/Kiln-AI/stripe_world
- Rystic simulators and pricing: https://www.rystic.ai/simulators and https://www.rystic.ai/pricing
- Plurai simulation launch post (11 Nov 2026): https://www.plurai.ai/blog/how-plurai-tests-real-agents-in-simulated-worlds
