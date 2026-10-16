# Mockifyer + Vitest Demo

This demo shows how to use Mockifyer for record/replay HTTP mocking with fetch in Vitest tests.

## Run it

```bash
npm install
npm test
```

## What it demonstrates

- Recording HTTP responses as JSON files in the repo
- Replaying recorded responses offline
- Using Mockifyer's filesystem provider for WebContainers
- Date manipulation with `getCurrentDate()`

## Recording new mocks

The demo includes pre-recorded mocks. To record fresh responses:

```bash
npm run record
```

This hits `https://demo.devxtools.dev/tasks/1` and saves the response to `mock-data/default/`.

## Packages

- `@sgedda/mockifyer-core` 1.10.181
- `@sgedda/mockifyer-fetch` 1.8.100
- `vitest` 5.0.5
