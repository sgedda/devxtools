# Keploy and Mockifyer guide tests (2026-11-10)

Repro of the hands-on checks behind [`/guides/keploy-and-mockifyer/`](https://devxtools.dev/guides/keploy-and-mockifyer/). It contains the apps, the exact commands, the settings that were required, and the expected results. It does not include run logs or the Keploy binary.

These runs did **not** cover React Native, client lanes, the dashboard UI, or multi-service hops/trace.

## Mockifyer (fetch and axios record/replay)

What we ran on 2026-11-10, on **Node 24.22.1**, against a local HTTP API that returns `{ path, version }`:

- Packages: `@sgedda/mockifyer-core` **1.10.190**, `@sgedda/mockifyer-fetch` **1.8.106**, `@sgedda/mockifyer-axios` **1.10.35**, `axios` **1.21.1** (axios 1.x).
- Recorded a `fetch` call to `/users/1` and an axios call to `/orders/7` while the API served `version: "1"`.
- Changed the live body to `version: "2"`.
- Replay served the recording (`version: "1"`), not the new live body.

Replay needed all four of these settings. Leaving any of them out failed in the 10 Nov matrix:

- `useGlobalFetch: true` (or `useGlobalAxios: true` for axios in ESM)
- `domainPathRulesMode: 'record_all'`
- `MOCKIFYER_RECORD_RESPONSES=true` (otherwise the saved mock had an empty body / `responsePending`)
- `MOCKIFYER_RECORD_DEFAULT_ALWAYS_USE_REAL_API=false` (otherwise replay called the live API)

`npm test` below re-runs that successful record-then-replay check. It does not start Keploy.

```bash
npm install
npm test
```

Expected result: exit 0 and a line

`PASS: fetch and axios recorded at version 1 and replayed it after the live API changed to 2`

## Keploy (not run by `npm test`, not in CI)

What we ran on 2026-11-10 on **Linux**, with the official open-source CLI **v3.6.229** (`keploy_linux_amd64.tar.gz` from the GitHub release). No account was created. Docker was not used or installed.

`app.js` is a small Node `http` server on `127.0.0.1:8080` with `/hello` and `/health`.

```bash
# Install the OSS CLI v3.6.229, for example:
#   curl -sL https://github.com/keploy/keploy/releases/download/v3.6.229/keploy_linux_amd64.tar.gz | tar -xz
#   chmod +x keploy

./keploy --disable-ansi record -c "node app.js" --cmd-type native --record-timer 30s --path .
# While record is running, in another terminal:
./send-traffic.sh
# After record exits:

./keploy --disable-ansi test -c "node app.js" --cmd-type native --delay 5 --path .
```

Expected result from that run:

- `keploy record` exited 0 and wrote **24** test cases in `keploy/test-set-0/tests/` (12× `/hello`, 12× `/health`).
- `keploy test` exited 0: **24 passed, 0 failed**.

Keploy attaches to the kernel (eBPF) and typically needs root or additional capabilities. Do not add this part to CI. `send-traffic.sh` repeats the 12+12 curl pattern from the 10 Nov run; start it after the recorder is ready, while the 30s record timer is still running.
