# Mockifyer + Vitest Demo

**Disclosure:** Mockifyer is built by this site's maintainer.

This demo shows record/replay HTTP mocking with Mockifyer and Vitest. Mocks are stored as JSON files in your repo and replayed offline—no network required.

## Requirements

- Node 22.12+ (required by vitest 5)

## Run it

```bash
npm install
npm test
```

`npm test` runs the pre-recorded replay tests and a record-then-replay test. The latter calls `https://demo.devxtools.dev/tasks/1` once (the live shared demo API), writes a mock file, edits that file, and asserts the second call returns the edited body — so the second call was served from the recording, not the live API. Times for both calls are printed in the test output.

That live record/replay path is not Mockifyer's default: it sets `useGlobalFetch: true`, `domainPathRulesMode: 'record_all'`, `MOCKIFYER_RECORD_RESPONSES=true` and `MOCKIFYER_RECORD_DEFAULT_ALWAYS_USE_REAL_API=false`.

## What it demonstrates

- Recording HTTP responses as JSON files with Mockifyer
- Replaying recorded responses offline
- Using Mockifyer's filesystem provider for Node.js
- Date manipulation with `getCurrentDate()`
- Strict replay mode with `failOnMissingMock: true`

## Verifying replay works

To prove the tests are using mocks (not the live API):

1. **Edit the mock file**:
   ```bash
   # Find the mock file
   ls mock-data/default/*_GET_demo_devxtools_dev_tasks_1.json
   
   # Edit it and change the title field:
   # "title": "Set up project repository" → "title": "OFFLINE-CHECK"
   ```

2. **Run the tests**:
   ```bash
   npm test
   ```

3. **Observe**: Tests will fail with `Expected: "Set up project repository" Received: "OFFLINE-CHECK"`, proving the mock was replayed.

## Recording new mocks

The demo includes pre-recorded mocks. To record fresh responses:

```bash
npm run record
```

**Important:** By default, Mockifyer records with `alwaysUseRealApi: true`, which means the mock is saved but **the live API is still used** for subsequent requests until you manually activate the mock. To make mocks immediately replayable, the `record.js` script sets `process.env.MOCKIFYER_RECORD_DEFAULT_ALWAYS_USE_REAL_API = 'false'` before calling `setupMockifyer`.

Without this setting, `npm run record` would save a mock that doesn't replay, and offline tests would hang trying to reach the real API.

## Running with networking disabled

To prove the **pre-recorded** replay tests run offline:

```bash
# Block outbound connections (Linux)
unshare -rn npx vitest run api.test.js
```

Those tests pass because `failOnMissingMock: true` enforces strict replay. The new `record-replay.test.js` is excluded here: its first call needs `https://demo.devxtools.dev`.

## Packages

- `@sgedda/mockifyer-core` 1.10.190
- `@sgedda/mockifyer-fetch` 1.8.106
- `vitest` 5.0.5

## Key configuration

The pre-recorded tests in `api.test.js` use:
- `useGlobalFetch: true` — patches global `fetch` to intercept requests
- `recordMode: false` — replay only (no live API calls)
- `failOnMissingMock: true` — throws if a mock is missing (enforces offline replay)
- `domainPathRulesMode: 'record_all'` — allows mocking without explicit rules

`record-replay.test.js` is not Mockifyer's default path. It also sets `useGlobalFetch: true` and `domainPathRulesMode: 'record_all'`, plus `MOCKIFYER_RECORD_RESPONSES=true` and `MOCKIFYER_RECORD_DEFAULT_ALWAYS_USE_REAL_API=false`, then records one live response and replays it with `recordMode: false` and `failOnMissingMock: true`.

## Limits

Based on Mockifyer's implementation:

- **Request matching**: Method + full URL (including query string). Headers are not matched by default unless configured via `requestMatching` options.
- **Date behavior**: `getCurrentDate()` returns the fixed date from `dateManipulation.fixedDate`. `new Date()` returns real system time—use `getCurrentDate()` for consistent test dates.
- **Mock file naming**: Timestamped files like `2026-10-16T21-42-28-914Z_GET_demo_devxtools_dev_tasks_1.json`. Mockifyer finds the most recent match for each request.
