---
title: "Pact Contract Testing in JavaScript: Keep Your Mocks Honest"
description: "A Pact contract testing example in TypeScript: consumer test, pact file, provider verification, Pact Broker, can-i-deploy, and keeping MSW mocks honest."
slug: "/guides/pact-contract-testing-javascript/"
canonical: "https://devxtools.dev/guides/pact-contract-testing-javascript/"
replaces: "/guides/keeping-mocks-honest-pact/ (noindexed stub; 301 to this URL)"
h1: "Keeping API Mocks Honest with Pact Contract Testing"
primary_keyword: "pact contract testing"
breadcrumbs: [{ name: "Home", url: "/" }, { name: "Guides", url: "/guides/" }, { name: "Pact Contract Testing in JavaScript", url: "/guides/pact-contract-testing-javascript/" }]
schema: ["TechArticle", "BreadcrumbList", "FAQPage"]
author: "DevX Tools"
datePublished: "2026-10-15"
dateModified: "2026-10-15"
tested_with: "@pact-foundation/pact 17.1.4 (pact_ffi 0.5.8, Pact Specification V4), @pact-foundation/pact-cli 18.1.2 (help output only), Vitest 5.0.5, msw 3.0.3, Express 5.3.0, Node 22.23.3; 2026-10-15"
tools: ["pact", "msw", "prism", "microcks", "wiremock", "spectral"]
---

# Keeping API Mocks Honest with Pact Contract Testing
**Pact contract testing catches the moment your frontend's API mocks stop matching the real API, before it reaches production.** Your consumer's tests record the requests they make and the responses they rely on into a contract (a "pact"). The provider's CI replays that contract against the real service. This guide builds a complete TypeScript example, shows real failure output, and connects Pact to the MSW mocks your frontend already uses.

> **Tested with** @pact-foundation/pact 17.1.4 (Pact Specification V4), Vitest 5.0.5, MSW 3.0.3 and Express 5.3.0 on Node 22.23.3 (2026-10-15). The consumer test, provider verification, failure output and MSW-from-pact helper all ran on our machine. We didn't run a Pact Broker or PactFlow: those commands come from the official docs and CLI help. devxtools.dev is independent and has no relationship with the Pact Foundation or SmartBear (PactFlow).

## TL;DR

Pact is a consumer-driven contract testing tool. Your consumer's tests record the requests and responses they rely on into a contract, and the provider replays that contract against the real service to prove it still matches. Use it alongside MSW or Prism mocks, so the mocks your frontend relies on can't silently drift from the API.

| | Pact (consumer-driven) | OpenAPI + Prism validation | Schemathesis | Spring Cloud Contract |
|---|---|---|---|---|
| Source of truth | Consumer tests (examples) | OpenAPI spec | OpenAPI/GraphQL schema | Provider-defined contracts |
| Catches | Breaking changes for real consumers | Spec violations | Schema/edge-case bugs | Provider contract breaks |
| Languages | Many (JS, JVM, Python, Go, …) | Any (HTTP proxy) | Any (HTTP) | JVM-first |
| Needs a broker | Recommended (Pact Broker/PactFlow) | No | No | No (artifacts) |

## The problem: mocks drift from the real API

Frontend teams mock APIs for good reasons: fast tests, offline development, deterministic states. [MSW](/tools/msw/) handlers, [Prism](/tools/prism/) mocks and JSON fixtures all encode an assumption: "`GET /users/1` returns `{ id, name, email }`".

Then the backend renames `email` to `emailAddress`. Every frontend test still passes, because the mocks still say `email`. The bug shows up in staging if you're lucky, and in production if you're not.

Mocks aren't the problem. *Unverified* mocks are. Contract testing adds the missing check: the provider must prove it still satisfies what consumers expect.

## What contract testing is

- **Consumer-driven:** the consumer (web app, mobile app, another service) writes tests against a Pact mock provider. Each test describes one interaction: request, expected response, and the provider state it needs ("user 1 exists").
- **Contract by example:** the pact file contains concrete examples plus **matching rules** ("any integer", "a string matching this regex"), so the provider doesn't need identical data.
- **Provider verification:** the provider's CI replays each interaction against the real running service, after setting up the required state, and fails if a response doesn't match.
- **Only what's used:** a pact covers the fields and endpoints consumers actually rely on. The provider can change anything else freely.

This differs from **schema testing** (OpenAPI validation, Schemathesis), which checks the implementation against a spec, whether or not any consumer uses a given field. They're complementary, as covered below.

## A complete example in TypeScript

The setup: a `web-app` consumer with a `UserClient`, and a `users-api` provider built with Express. One repo here for simplicity. In real life they'd be separate repos sharing pacts through a broker.

```bash
npm i -D @pact-foundation/pact vitest
```

`@pact-foundation/pact` 17.1.4 declares Node `>=22` and bundles the Rust core (pact_ffi) as a native library. It installed without a build step on our Linux machine.

### Consumer test with PactV4 and matchers

```ts
// src/userClient.ts
export interface User { id: number; name: string; email: string }

export class UserClient {
  constructor(private baseUrl: string) {}

  async getUser(id: number): Promise<User | null> {
    const res = await fetch(`${this.baseUrl}/users/${id}`, { headers: { Accept: 'application/json' } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}
```

```ts
// test/userClient.pact.test.ts
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { PactV4, MatchersV3 } from '@pact-foundation/pact';
import { UserClient } from '../src/userClient';

const { like, integer, regex } = MatchersV3;

const provider = new PactV4({
  consumer: 'web-app',
  provider: 'users-api',
  dir: path.resolve(process.cwd(), 'pacts'),
});

describe('UserClient ↔ users-api', () => {
  it('gets an existing user', async () => {
    await provider
      .addInteraction()
      .given('user 1 exists')
      .uponReceiving('a request for user 1')
      .withRequest('GET', '/users/1', (b) => b.headers({ Accept: 'application/json' }))
      .willRespondWith(200, (b) =>
        b.headers({ 'Content-Type': 'application/json' }).jsonBody({
          id: integer(1),
          name: like('Ada Lovelace'),
          email: regex(/^[^@\s]+@[^@\s]+$/, 'ada@example.com'),
        }),
      )
      .executeTest(async (mockServer) => {
        const user = await new UserClient(mockServer.url).getUser(1);
        expect(user).toEqual({ id: 1, name: 'Ada Lovelace', email: 'ada@example.com' });
      });
  });

  it('returns null for a missing user', async () => {
    await provider
      .addInteraction()
      .given('user 999 does not exist')
      .uponReceiving('a request for a missing user')
      .withRequest('GET', '/users/999', (b) => b.headers({ Accept: 'application/json' }))
      .willRespondWith(404)
      .executeTest(async (mockServer) => {
        expect(await new UserClient(mockServer.url).getUser(999)).toBeNull();
      });
  });
});
```

Both tests passed in about half a second. `executeTest` starts a Pact mock server on a random port, your real client code calls it, and Pact fails the test if the client sent a request that wasn't described, or didn't send one that was. The matchers matter: `integer(1)` means "any integer, e.g. 1", `like('Ada Lovelace')` means "any string", and `regex(...)` constrains the format. Use them so the provider isn't forced to return your exact example data.

### The generated pact file

Running the consumer tests wrote `pacts/web-app-users-api.json`. An excerpt:

```json
{
  "consumer": { "name": "web-app" },
  "provider": { "name": "users-api" },
  "interactions": [
    {
      "description": "a request for user 1",
      "providerStates": [{ "name": "user 1 exists" }],
      "request": { "method": "GET", "path": "/users/1", "headers": { "Accept": ["application/json"] } },
      "response": {
        "status": 200,
        "headers": { "Content-Type": ["application/json"] },
        "body": { "content": { "email": "ada@example.com", "id": 1, "name": "Ada Lovelace" }, "contentType": "application/json" },
        "matchingRules": {
          "body": {
            "$.email": { "combine": "AND", "matchers": [{ "match": "regex", "regex": "^[^@\\s]+@[^@\\s]+$" }] },
            "$.id": { "combine": "AND", "matchers": [{ "match": "integer" }] },
            "$.name": { "combine": "AND", "matchers": [{ "match": "type" }] }
          }
        }
      },
      "type": "Synchronous/HTTP"
    }
  ],
  "metadata": { "pact-js": { "version": "17.1.4" }, "pactSpecification": { "version": "4.0" } }
}
```

This JSON file is the contract. Commit it as a build artifact or, better, publish it to a broker.

### Provider verification with provider states

```ts
// provider/app.ts
import express from 'express';

export const db = new Map<number, { id: number; name: string; email: string }>();

export function createApp() {
  const app = express();
  app.get('/users/:id', (req, res) => {
    const user = db.get(Number(req.params.id));
    if (!user) return res.status(404).json({ error: 'not_found' });
    res.json(user);
  });
  return app;
}
```

```ts
// test/provider.pact.test.ts
import path from 'node:path';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { Verifier } from '@pact-foundation/pact';
import { createApp, db } from '../provider/app';

let server: Server;
beforeAll(() => new Promise<void>((resolve) => { server = createApp().listen(8081, resolve); }));
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe('users-api honours its consumers', () => {
  it('verifies the web-app pact', () =>
    new Verifier({
      provider: 'users-api',
      providerBaseUrl: 'http://localhost:8081',
      pactUrls: [path.resolve(process.cwd(), 'pacts/web-app-users-api.json')],
      stateHandlers: {
        'user 1 exists': async () => {
          db.set(1, { id: 1, name: 'Grace Hopper', email: 'grace@example.com' });
        },
        'user 999 does not exist': async () => {
          db.delete(999);
        },
      },
    }).verifyProvider(), 30_000);
});
```

It passed, even though the provider returned *Grace Hopper*, not the consumer's *Ada Lovelace* example. The matchers only required "a string" and "an email-shaped string". Express's `application/json; charset=utf-8` also satisfied the `Content-Type` expectation.

**Now break it.** We changed the provider to return `emailAddress` instead of `email` and re-ran verification:

```text
Failures:

1) Verifying a pact between web-app and users-api Given user 1 exists - a request for user 1
    1.1) has a matching body
           $ -> Actual map is missing the following keys: email
    {
    -  "email": "ada@example.com",
    +  "emailAddress": "grace@example.com",
       "id": 1,
    -  "name": "Ada Lovelace"
    +  "name": "Grace Hopper"
    }

There were 1 pact failures
```

That's the bug from the introduction, caught in the provider's CI with the name of the consumer it would break. (The `name` lines show as a diff but don't fail: only the missing key does.)

### Run both in CI

- **Consumer pipeline:** run the Pact tests, which write `pacts/*.json`, then publish the pacts tagged with the git SHA and branch.
- **Provider pipeline:** fetch the relevant pacts (from the broker, or from `pactUrls` in a monorepo), run the Verifier against the service, and publish verification results.
- **Order matters locally:** the provider test and anything that reads the pact file need the consumer tests to have run first.

## Sharing contracts: Pact Broker, PactFlow and can-i-deploy

Copying pact files between repos doesn't scale. The **Pact Broker** (open source, MIT, self-hosted) stores pacts and verification results per version and branch, and **PactFlow** (SmartBear) is the hosted, commercial version with extra features.

```bash
# consumer CI — publish (flags from `pact-broker publish --help`, pact-cli 18.1.2)
npx pact-broker publish ./pacts \
  --broker-base-url "$PACT_BROKER_BASE_URL" \
  --consumer-app-version "$GIT_SHA" --branch "$GIT_BRANCH"

# before deploying either side
npx pact-broker can-i-deploy --pacticipant web-app --version "$GIT_SHA" --to-environment production

# after deploying
npx pact-broker record-deployment --pacticipant web-app --version "$GIT_SHA" --environment production
```

`can-i-deploy` exits 0 or 1 depending on whether that version has successful verifications with the versions currently in the target environment, so it can gate a deploy directly. In the provider, point the `Verifier` at the broker (`pactBrokerUrl`, `consumerVersionSelectors`, `publishVerificationResult: true`, `providerVersion`, `providerVersionBranch`) instead of `pactUrls`. Broker **webhooks** can trigger the provider build when a consumer publishes a changed pact. We didn't run a broker for this page.

**PactFlow pricing (2026-10-15):** Starter is free (unlimited users, 2 integrations, bi-directional contract testing). Team is $115.42/month billed yearly ($1,385/year) or $127/month billed monthly, for 50 integrations. Enterprise is quote-based.

## Pact + MSW: using the same scenarios in mocks and contracts

You probably already have MSW handlers. There are three ways to connect them to Pact:

1. **Generate MSW handlers from the verified pact (what we tested).** The pact is the source of truth, and your dev/test mocks are derived from it, so they can't contain anything the provider hasn't verified:

```ts
// src/mswFromPact.ts
import { readFileSync } from 'node:fs';
import { http, HttpResponse } from 'msw';

type Interaction = {
  providerStates?: { name: string }[];
  request: { method: string; path: string };
  response: { status: number; body?: { content?: unknown } };
};

export function handlersFromPact(pactPath: string, baseUrl: string, state?: string) {
  const pact = JSON.parse(readFileSync(pactPath, 'utf8')) as { interactions: Interaction[] };
  return pact.interactions
    .filter((i) => !state || i.providerStates?.some((s) => s.name === state))
    .map((i) => {
      const method = i.request.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
      return http[method](`${baseUrl}${i.request.path}`, () =>
        i.response.body?.content !== undefined
          ? HttpResponse.json(i.response.body.content as any, { status: i.response.status })
          : new HttpResponse(null, { status: i.response.status }),
      );
    });
}
```

With `setupServer(...handlersFromPact('pacts/web-app-users-api.json', 'https://api.example.com'))`, our `UserClient` got Ada for user 1 and `null` for user 999 under MSW 3.0.3. That's exactly the verified behaviour. The trade-off: it only covers exact paths in the pact (no path parameters or request matching), and component tests can only use scenarios that exist as Pact interactions. Treat the helper as a starting point.

2. **Share fixtures in both directions.** Keep response examples in one `fixtures/` module, used by both the MSW handlers and the Pact `jsonBody` examples (wrapped in matchers). It's flexible, but someone has to keep the two usages aligned.

3. **Record MSW traffic into pacts.** PactFlow's MIT-licensed `@pactflow/pact-msw-adapter` (4.0.2 on npm) generates pacts from the requests your MSW handlers serve during tests. That turns existing mocks into consumer contracts, and it pairs naturally with bi-directional contract testing. The catch: the contract is only as good as your mocks, and there are no matchers unless you add them. We didn't test this approach.

Whichever you choose, the rule is the same: **every response shape your UI depends on should appear in a contract the provider verifies.**

## Pact vs OpenAPI-based checks

- **[Prism](/tools/prism/) validation proxy:** put `prism proxy openapi.yaml <real-api> --errors` between tests and the real API, and requests or responses that violate the spec become errors. It needs no consumer participation, but it checks the spec, not what consumers actually use.
- **Schemathesis:** generates many requests from the spec and finds undocumented status codes and schema violations. When we ran it for our API testing tools guide, it found three spec mismatches in a "finished" fixture API in seconds. It answers "does the implementation match the spec?", not "will this consumer break?"
- **[Spectral](/tools/spectral/):** lints the spec itself (naming, descriptions, your style rules) before any code runs.
- **Bi-directional contract testing (PactFlow):** the consumer publishes a pact (from Pact, or generated from mocks), the provider publishes its OpenAPI spec plus evidence it was tested, and PactFlow checks compatibility without replaying requests against the provider. It's useful when providers won't run Pact verification, with the caveat that it's only as good as the provider's spec and its tests.
- **[Microcks](/tools/microcks/):** an open-source mocking and testing platform that runs contract tests against implementations from OpenAPI, AsyncAPI, Postman collections and more.

A practical combination: Spectral on the spec, Schemathesis on the provider, Pact between teams that own the consumer and the provider.

## Common mistakes

- **Testing UI behaviour through Pact.** Pact tests should exercise your API client layer, not render components. Keep UI tests on MSW (ideally with handlers derived from the pact).
- **Over-specified matchers.** Exact values everywhere force the provider to return your example data and make verification brittle. Use `like`, `integer`, `regex` and `eachLike`, and use exact values only where the value matters (enums, status codes).
- **Under-specified contracts.** `like({})` on a whole body verifies nothing. Describe the fields you actually read.
- **Missing or leaky provider states.** Every `given(...)` needs a state handler that sets up *and isolates* data. A state handler that depends on whatever is left in the database makes verification flaky.
- **Using Pact as a functional test suite for the provider.** Pact checks shape and semantics that consumers rely on. Business rules belong in the provider's own tests.
- **Skipping `can-i-deploy`.** Without it, a broken verification only shows up as a red build that someone may ignore. With it, the deploy is blocked.

## Pact alternatives

- **Spring Cloud Contract:** provider-driven contracts (Groovy/YAML DSL) for JVM services. It generates provider tests and WireMock stubs for consumers. A natural fit for Spring shops.
- **Schema-first tooling:** OpenAPI + Prism validation, Schemathesis and Spectral. There's no broker and no consumer participation, which is good when you control both sides or publish a public API.
- **[Microcks](/tools/microcks/):** mocking plus contract testing from API specs and collections, including event-driven APIs (AsyncAPI).
- **Stub servers with verification:** [WireMock](/tools/wiremock/) stubs shared between teams can work for small setups, but nothing forces the provider to honour them. That's the gap Pact fills.

## FAQ

### What is Pact contract testing?
Pact is a consumer-driven contract testing tool. Consumer tests run against a Pact mock provider and record each request and the response they need into a pact file. The provider then verifies that pact against its real implementation. Pact supports JavaScript/TypeScript, JVM languages, Python, Go, .NET, Rust and more.

### Pact contract testing example in JavaScript?
Install `@pact-foundation/pact`. In the consumer, create `new PactV4({ consumer, provider })`, then `addInteraction().given().uponReceiving().withRequest().willRespondWith().executeTest()` with your real API client inside `executeTest`. In the provider, run `new Verifier({ providerBaseUrl, pactUrls, stateHandlers }).verifyProvider()`. The full tested example is above.

### What is the difference between Pact and contract testing?
Contract testing is the general practice of verifying that two services agree on their interface. Pact is one specific, consumer-driven implementation of it, with its own file format, libraries for many languages, and the Pact Broker for sharing contracts. Spring Cloud Contract and bi-directional (spec-based) contract testing are other approaches.

### Pact vs Spring Cloud Contract?
Pact is consumer-driven and polyglot: consumers define expectations, any language can take part, and a broker coordinates versions. Spring Cloud Contract is provider-driven and JVM-first: the provider defines contracts, and the tool generates provider tests and WireMock stubs for consumers. Choose Pact for mixed stacks like a JS frontend with a Node or Go backend, and Spring Cloud Contract for Spring-only systems.

### Do I need a Pact Broker?
Not to start. For one consumer and one provider in a monorepo, pointing the Verifier at the pact file works (that's what we ran). Once teams and repos are separate, a broker (self-hosted Pact Broker or PactFlow) is strongly recommended. It stores versions, records verification results and powers `can-i-deploy`.

### What are alternatives to Pact?
Spring Cloud Contract (JVM, provider-driven), OpenAPI-based checks (a Prism validation proxy, Schemathesis, Spectral), PactFlow's bi-directional contract testing, and Microcks for spec-driven mocking and contract tests. Many teams combine schema checks with Pact rather than choosing one.

## Related

- [Pact](/tools/pact/) · [MSW](/tools/msw/) · [Prism](/tools/prism/) · [Spectral](/tools/spectral/)
- [Microcks](/tools/microcks/) · [WireMock](/tools/wiremock/)
- [MSW vs Nock](/comparisons/msw-vs-nock/) · [Mocking & test data](/mocking-test-data/) · [Testing](/testing/)

## Sources

All accessed 2026-10-15.

- Pact docs, introduction: https://docs.pact.io/
- Pact JS consumer tests (PactV4, matchers): https://docs.pact.io/implementation_guides/javascript/docs/consumer
- Pact JS provider verification (Verifier, state handlers, broker options): https://docs.pact.io/implementation_guides/javascript/docs/provider
- Pact JS repository and npm package (17.1.4, engines node >=22, MIT): https://github.com/pact-foundation/pact-js · https://www.npmjs.com/package/@pact-foundation/pact
- can-i-deploy: https://docs.pact.io/pact_broker/can_i_deploy
- Pact Broker (MIT): https://github.com/pact-foundation/pact_broker
- Pact CLI (`@pact-foundation/pact-cli` 18.1.2; `pact-broker publish` / `can-i-deploy` help output)
- PactFlow pricing: https://pactflow.io/pricing/; bi-directional contract testing: https://pactflow.io/bi-directional-contract-testing/; MSW adapter: https://www.npmjs.com/package/@pactflow/pact-msw-adapter
- Spring Cloud Contract: https://spring.io/projects/spring-cloud-contract
- MSW docs: https://mswjs.io/docs/
- Prism validation proxy: https://github.com/stoplightio/prism/blob/master/docs/guides/03-validation-proxy.md
- Schemathesis: https://schemathesis.readthedocs.io/
- npm downloads API: @pact-foundation/pact ~647K/week (Oct 6–12, 2026)
