# Mockifyer + Vitest Demo

This demo shows record/replay HTTP mocking with Mockifyer and Vitest. Mocks are stored as JSON files in your repo and replayed offline—no network required.

## Run it

```bash
npm install
npm test
```

## What it demonstrates

- Recording HTTP responses as JSON files with Mockifyer
- Replaying recorded responses completely offline
- Using Mockifyer's filesystem provider for Node.js/WebContainers
- Date manipulation with `getCurrentDate()`
- Proof that mocks are replayed, not hitting the live API

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

This demo includes a test that temporarily blocks network access to verify mocks are replayed locally.

## Recording new mocks

The demo includes pre-recorded mocks. To record fresh responses:

```bash
npm run record
```

This hits `https://demo.devxtools.dev/tasks/1` and saves the response to `mock-data/default/`. The mock is immediately ready for replay (no `alwaysUseRealApi` flag).

## Running with networking disabled

To prove tests run completely offline:

```bash
# Block outbound connections (Linux/macOS)
unshare --net npm test  # Linux
# or
networksetup -setairportpower en0 off && npm test && networksetup -setairportpower en0 on  # macOS

# Tests should still pass because they use local mocks
```

## Packages

- `@sgedda/mockifyer-core` 1.10.181
- `@sgedda/mockifyer-fetch` 1.8.100
- `vitest` 5.0.5

## Key configuration

The test uses:
- `useGlobalFetch: true` — patches global `fetch` to intercept requests
- `recordMode: false` — replay only (no live API calls)
- `failOnMissingMock: true` — throws if a mock is missing
- `domainPathRulesMode: 'record_all'` — allows mocking without explicit rules

When recording, set `MOCKIFYER_RECORD_DEFAULT_ALWAYS_USE_REAL_API=false` so mocks are replayed immediately (without this env var, new mocks keep using the live API until manually activated).
