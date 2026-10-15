---
title: "OpenAPI Mock Server with Prism: Spec-First Guide (2026)"
description: "Run an OpenAPI mock server with Prism: static vs dynamic responses, examples, Docker, CI, request validation, proxy mode, and alternatives like Mockoon."
slug: "/guides/openapi-mock-server-prism/"
canonical: "https://devxtools.dev/guides/openapi-mock-server-prism/"
h1: "Spec-First API Mocking: Run an OpenAPI Mock Server with Prism"
primary_keyword: "openapi mock server"
breadcrumbs: [{ name: "Home", url: "/" }, { name: "Guides", url: "/guides/" }, { name: "OpenAPI mock server with Prism", url: "/guides/openapi-mock-server-prism/" }]
schema: ["TechArticle", "BreadcrumbList", "FAQPage"]
author: "DevX Tools"
datePublished: "2026-10-15"
dateModified: "2026-10-15"
tested_with: "@stoplight/prism-cli 5.16.0 (declares Node >=24.18.0) on Node 22.23.3; Mockoon CLI 9.9.0; Docker image stoplight/prism (tags checked on Docker Hub 2026-10-15, Docker itself not available on the test machine)"
tools: ["prism", "stoplight", "spectral", "mockoon", "wiremock", "microcks", "postman-mock-servers", "openapi-generator", "faker", "pact"]
replaces: "src/pages/guides/spec-first-mocking-prism-openapi.astro (noindex stub); recommend 301 from /guides/spec-first-mocking-prism-openapi/ to this slug"
---

**An OpenAPI mock server turns your API description into a running HTTP server** so frontends and tests can call real endpoints before the backend exists. Prism, from Stoplight (Apache-2.0), is the CLI most teams reach for: point it at an OpenAPI or Swagger file, or a Postman collection, and it listens on port 4010.

> **Tested with** `@stoplight/prism-cli` 5.16.0 on Node 22.23.3 (2026-10-15). Every curl response below comes from that run against the `users.yaml` in this guide. Mockoon CLI 9.9.0 was used for the comparison. We couldn't run Docker on the test machine; Docker commands follow Stoplight's docs and the `stoplight/prism` tags on Docker Hub. Lint the spec with [Spectral](/tools/spectral/) first. devxtools.dev is independent and has no relationship with Stoplight or SmartBear.

## TL;DR

Prism turns any OpenAPI 2/3.x file (or Postman collection) into a running mock server with one command. It returns your spec's examples or schema-generated data, and it rejects requests that break the contract. Use it when the **spec is the source of truth**. Pick [Mockoon](/tools/mockoon/) or [WireMock](/tools/wiremock/) when you need stateful or hand-tuned scenarios.

## What a spec-first mock server gives you

Three things, if the OpenAPI file is kept honest:

1. **Frontend unblocked.** The UI can call `/users` tomorrow, even if the real service ships next month.
2. **Contract-shaped responses.** Status codes, schemas and examples come from the same document the backend will implement.
3. **Request validation.** Callers that send a bad body or an out-of-range query parameter get a 422 before the real API exists, so client bugs show up early.

The cost is that the mock is only as good as the spec. Stale examples produce stale UI. Pair Prism with a linter ([Spectral](/tools/spectral/)) and, later, with contract tests ([Pact](/tools/pact/)) or a validation proxy (covered below).

## Quick start

```bash
npm i -D @stoplight/prism-cli   # 5.16.0 at the time of writing; declares Node >=24.18.0
# or, one-shot:
npx @stoplight/prism-cli mock openapi.yaml
```

Prism 5.16.0 declares Node >=24.18.0 in its `engines` field. Our runs used Node 22.23.3, and a basic mock also worked on 20.19.2 and 24.22.0, but use Node 24.18+ for a supported setup. Prism listens on `http://127.0.0.1:4010` by default (`-p` / `-h` change that). CORS is on by default.

Here's the OpenAPI 3.1 document we used. Save it as `users.yaml`:

```yaml
openapi: 3.1.0
info: { title: Users API, version: "1.0.0" }
paths:
  /users:
    get:
      parameters:
        - { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 100 } }
      responses:
        "200":
          description: A list of users
          content:
            application/json:
              schema: { type: array, items: { $ref: "#/components/schemas/User" } }
              examples:
                two-users:
                  value:
                    - { id: 1, name: Ada Lovelace, email: ada@example.com }
                    - { id: 2, name: Alan Turing, email: alan@example.com }
                empty: { value: [] }
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/NewUser" }
      responses:
        "201":
          description: Created
          content:
            application/json:
              schema: { $ref: "#/components/schemas/User" }
        "422":
          description: Validation error
          content:
            application/json:
              example: { error: invalid_email }
  /users/{id}:
    get:
      parameters:
        - { name: id, in: path, required: true, schema: { type: integer } }
      responses:
        "200":
          description: A user
          content:
            application/json:
              schema: { $ref: "#/components/schemas/User" }
        "404":
          description: Not found
          content:
            application/json:
              example: { error: not_found }
components:
  schemas:
    User:
      type: object
      required: [id, name, email]
      properties:
        id: { type: integer, minimum: 1 }
        name: { type: string, x-faker: person.fullName }
        email: { type: string, format: email }
    NewUser:
      type: object
      required: [name, email]
      properties:
        name: { type: string, minLength: 1 }
        email: { type: string, format: email }
```

```bash
npx prism mock users.yaml
curl http://127.0.0.1:4010/users
# [{"id":1,"name":"Ada Lovelace","email":"ada@example.com"},{"id":2,"name":"Alan Turing","email":"alan@example.com"}]
```

Prism returns the first named example in static mode. An unknown path returns a `problem+json` 404 (`NO_PATH_MATCHED_ERROR`).

## Static vs dynamic responses

| Mode | How to enable | What you get |
|---|---|---|
| Static (default) | just `prism mock` | Spec examples, falling back to a Prism-generated example from the schema |
| Dynamic | `-d` / `--dynamic`, or `Prefer: dynamic=true` per request | Values from json-schema-faker (and `@faker-js/faker`) |

```bash
# Force the named "empty" example
curl -H 'Prefer: example=empty' http://127.0.0.1:4010/users
# []

# Generate a body from the schema (also: prism mock -d)
curl -H 'Prefer: dynamic=true' http://127.0.0.1:4010/users/5
# {"email":"…@….zks","id":71450359,"name":"Alivia Olson"}
```

The `x-faker` vendor extension picks a Faker method for a property (`person.fullName` in the example above). Prism currently depends on `@faker-js/faker` ^10.4 (our install resolved to 10.6.0). Dynamic mode also invents extra properties unless you pass `--json-schema-faker-fillProperties=false`. Without that flag we saw fields such as `dolore_7e2` appear next to `id` and `name`.

`--seed` makes dynamic generation more deterministic. With `--seed 42` and `--json-schema-faker-fillProperties=false`, two consecutive GETs returned the same `id` and `email`, but the `name` still changed. Don't treat seed alone as a promise of bit-identical responses across runs or Prism versions.

## Choosing responses: Prefer header and error cases

The `Prefer` request header controls which response Prism returns:

| Header | Effect (tested) |
|---|---|
| `Prefer: example=empty` | Named example |
| `Prefer: dynamic=true` | Schema-generated body |
| `Prefer: code=404` | The 404 response for that operation |

```bash
curl -H 'Prefer: code=404' http://127.0.0.1:4010/users/5
# HTTP/1.1 404 Not Found
# {"error":"not_found"}
```

That's the way to exercise empty lists, not-found pages and validation errors in a frontend without changing the mock process. Combine it with `-d` when the happy path needs fresh data and the error path needs a fixed example.

## Request validation

Prism validates inbound requests against the operation's parameters and request body. Invalid calls get a 422.

```bash
# limit max is 100
curl 'http://127.0.0.1:4010/users?limit=500'
# HTTP/1.1 422 Unprocessable Entity
# content-type: application/problem+json
# {"type":"https://stoplight.io/prism/errors#UNPROCESSABLE_ENTITY",…,   ← error-type identifier (not a live page)
#  "validation":[{"location":["query","limit"],"code":"maximum",
#    "message":"Request query parameter limit must be <= 100"}]}

# body fails format:email — Prism uses the 422 example from the spec
curl -X POST -H 'content-type: application/json' \
  -d '{"name":"x","email":"nope"}' http://127.0.0.1:4010/users
# HTTP/1.1 422
# sl-violations: [{"location":["request","body","email"],"code":"format",…}]
# {"error":"invalid_email"}
```

`--errors` (default `false`) also turns *response* schema violations into HTTP errors when Prism is used as a proxy. Leave it off for a pure mock; turn it on in CI against a real upstream.

For comparison, Mockoon CLI 9.9.0 imported the same `users.yaml` and returned **200** for `?limit=500` and **201** for the invalid POST. Mockoon doesn't do request-schema validation out of the box; Prism does. That difference alone is a reason to keep Prism when the OpenAPI document is the contract.

## Running Prism in Docker and CI

Docker wasn't available on our test machine. Per Stoplight's installation guide and the tags on Docker Hub (checked 2026-10-15; `latest` pointed at 5.15.10, while the npm CLI we used was 5.16.0):

```bash
# Pin a major. Mount the directory that holds the spec.
docker run --init --rm -v "$(pwd):/tmp" -p 4010:4010 \
  stoplight/prism:5 mock -h 0.0.0.0 /tmp/users.yaml
```

`-h 0.0.0.0` matters inside a container: the default `127.0.0.1` isn't reachable from the host.

**GitHub Actions.** Two patterns work:

```yaml
# Option A: start Prism in a step (no Docker required on the runner)
- run: npm i -D @stoplight/prism-cli
- run: npx prism mock users.yaml &
- run: npx wait-on http-get://127.0.0.1:4010/users
  # use http-get:// — Prism answers HEAD with 405, so wait-on's default http:// times out
```

```yaml
# Option B: service container (needs Docker on the runner).
# GitHub Actions added entrypoint/command overrides for services in April 2026.
services:
  prism:
    image: stoplight/prism:5
    command: mock -h 0.0.0.0 /tmp/users.yaml
    volumes:
      - ${{ github.workspace }}/users.yaml:/tmp/users.yaml:ro
    ports:
      - 4010:4010
```

Reach the service at `http://localhost:4010` from the job (or at the service hostname if the job itself runs in a container). Prefer starting Prism as a step when you don't want a Docker dependency.

## Pointing your app at the mock

Set the API base URL from an environment variable and point it at Prism in local and CI:

```bash
# .env.local (Vite / Next / CRA-style)
VITE_API_URL=http://127.0.0.1:4010
```

```ts
// Vite: optional path rewrite if the app calls /api/*
export default defineConfig({
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:4010', rewrite: (p) => p.replace(/^\/api/, '') },
    },
  },
});
```

**React Native / Expo.** `localhost` on an Android emulator is the emulator itself. Use `10.0.2.2` for the host machine, a LAN IP for a physical device, or `localhost` on the iOS simulator. See the [React Native mocking guide](/guides/mock-api-react-native/) for the broader options.

## Validation proxy mode: catch spec drift

`prism proxy <document> <upstream>` forwards each request to a real API and checks the response against the OpenAPI document. We pointed it at a tiny upstream that had renamed `email` to `emailAddress`:

```bash
# Terminal 1: a drifted "real" API on :4720
# Terminal 2:
npx prism proxy users.yaml http://localhost:4720 -p 4012
curl -i http://127.0.0.1:4012/users/5
# HTTP/1.1 200 OK
# sl-violations: [{"location":["response","body"],"code":"required",
#   "message":"Response body must have required property 'email'"}]
# {"id":5,"name":"Ada","emailAddress":"ada@example.com"}
```

With `--errors`, the same call becomes a **500** and Prism returns a `problem+json` body instead of the upstream payload. That's the mode to run in CI: a renamed field or a missing property fails the job before clients notice. Log line we saw: `[VALIDATOR] ✖  error  Violation: response.body … 'email'`.

## Prism vs other OpenAPI mock servers

| | Prism | Mockoon | WireMock | Microcks | Postman mock servers |
|---|---|---|---|---|---|
| Input | OpenAPI/Swagger, Postman collections | OpenAPI import or GUI | JSON stub mappings (OSS); OpenAPI/Swagger import in WireMock Cloud only (per wiremock.org) | OpenAPI, AsyncAPI, gRPC, GraphQL, SOAP, Postman, SoapUI | Postman collections |
| Dynamic data | json-schema-faker + `x-faker` | Templating helpers | Templating | Examples + template functions | Examples + Postman dynamic variables |
| Request validation | Yes (tested) | No by default (tested) | Request matching, not full schema validation | Request matching via dispatchers (per Microcks docs) | Matches saved examples (per Postman docs) |
| Stateful | No | Limited (CRUD routes, rules) | Scenarios | Yes, via SCRIPT dispatchers + `store` (since 1.10; values expire, default TTL 10 s) | No |
| Run as | CLI, Docker | Desktop, CLI, Docker | JVM, Docker | Kubernetes, Docker | Hosted (Postman account) |

Prism stays closest to the OpenAPI document. Mockoon is better when a designer or QA wants a GUI and a few stateful routes. WireMock earns its keep for recorded traffic and complex stub matching. Microcks covers more protocol families (AsyncAPI, gRPC) in one place and supports scripted stateful mocks. Hosted [Postman mock servers](/tools/postman-mock-servers/) fit teams already living in Postman.

Generate clients from the same spec with [OpenAPI Generator](/tools/openapi-generator/) so the mock and the typed client can't silently diverge.

## Limitations

- **Stateless.** A `POST /users` doesn't make a later `GET /users` return the new user. Prism generates a body from the 201 schema; in our run that was `{"id":1,"name":"string","email":"user@example.com"}`.
- **No persistence.** Restart Prism and every resource goes back to the examples.
- **Dynamic data isn't a database.** Faker-looking fields can still violate business rules your UI assumes (unique emails, foreign keys).
- **Auth is descriptive, not enforced as a real IdP.** Security schemes affect Prism's decision tree; they don't log you into OAuth.

When you need state, recorded traffic, or a GUI, move those scenarios to Mockoon or WireMock and keep Prism for contract-shaped happy paths and the validation proxy.

## FAQ

### What is an OpenAPI mock server?
A process that reads an OpenAPI (or Swagger) document and exposes the described paths over HTTP, returning examples or schema-generated bodies so clients can develop and test against the contract before the real API exists.

### How do I mock an API from an OpenAPI spec?
Install Prism (`npm i -D @stoplight/prism-cli`) and run `npx prism mock openapi.yaml`. It listens on port 4010. Use `Prefer: example=…`, `Prefer: code=…` or `--dynamic` to pick responses.

### Is Prism free?
Yes. The CLI and Docker image are Apache-2.0 open source (~227K weekly npm downloads for `@stoplight/prism-cli` in the week of 2026-10-06 to 2026-10-12). Stoplight also sells commercial API-design products that are separate from Prism.

### Can Prism return random data?
Yes. Pass `-d` / `--dynamic`, or send `Prefer: dynamic=true`. Responses are built with json-schema-faker; `x-faker` on a property selects a Faker method. Use `--seed` and `--json-schema-faker-fillProperties=false` for more control.

### How do I run Prism in Docker?
`docker run --init --rm -v "$(pwd):/tmp" -p 4010:4010 stoplight/prism:5 mock -h 0.0.0.0 /tmp/openapi.yaml`. Pin a major tag, and bind to `0.0.0.0` so the port is reachable from outside the container.

### Prism vs Mockoon: which should I use?
Use Prism when OpenAPI is the source of truth and you want request validation (and the validation proxy) for free. Use Mockoon when you want a desktop GUI, templating, or limited stateful CRUD without maintaining a full schema for every edge case.

## Related

- [Prism](/tools/prism/) · [Stoplight](/tools/stoplight/) · [Spectral](/tools/spectral/) · [Mockoon](/tools/mockoon/) · [WireMock](/tools/wiremock/) · [Microcks](/tools/microcks/) · [Postman mock servers](/tools/postman-mock-servers/) · [OpenAPI Generator](/tools/openapi-generator/) · [Faker](/tools/faker/) · [Pact](/tools/pact/)
- [Mocking & test data hub](/mocking-test-data/) · [API development hub](/api-development/) · [React Native mocking](/guides/mock-api-react-native/)

## Sources

- Prism README (OpenAPI v2/v3.x and Postman Collections; Apache-2.0): https://github.com/stoplightio/prism
- Prism HTTP mocking guide: https://github.com/stoplightio/prism/blob/master/docs/guides/01-mocking.md
- Prism dynamic responses / `x-faker`: https://github.com/stoplightio/prism/blob/master/docs/guides/11-dynamic-response-with-faker.md
- Prism installation (Docker examples): https://github.com/stoplightio/prism/blob/master/docs/getting-started/01-installation.md
- Prism CLI `--help` on 5.16.0 (`mock`, `proxy`, `--dynamic`, `--errors`, `--seed`, `--json-schema-faker-fillProperties`)
- Docker Hub tags for `stoplight/prism` (checked 2026-10-15): https://hub.docker.com/r/stoplight/prism/tags
- GitHub Actions service-container `command` / `entrypoint` (April 2026): https://docs.github.com/en/actions/using-containerized-services/about-service-containers
- Microcks supported specs (OpenAPI, AsyncAPI, gRPC, GraphQL, SOAP, Postman, SoapUI): https://github.com/microcks/microcks · https://microcks.io/
- WireMock OSS vs Cloud (OpenAPI import is Cloud-only): https://wiremock.org/docs/wiremock-cloud/
- Microcks stateful mocks (1.10+): https://microcks.io/documentation/guides/usage/stateful-mocks/
- Mockoon CLI: https://github.com/mockoon/mockoon · comparison run with `@mockoon/cli` 9.9.0 on the same `users.yaml`
- npm weekly downloads for `@stoplight/prism-cli` (2026-10-06 to 2026-10-12): https://api.npmjs.org/downloads/point/last-week/@stoplight/prism-cli
- Our runs: /workspace/prismtest on the box, 2026-10-15
