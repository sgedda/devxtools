---
title: "Pino vs Winston (2026): Node.js Logger Speed & Features"
description: "Pino vs Winston compared with code: performance, JSON output, transports, redaction, child loggers, NestJS/Fastify setup and OpenTelemetry correlation."
slug: "/comparisons/pino-vs-winston/"
canonical: "https://devxtools.dev/comparisons/pino-vs-winston/"
h1: "Pino vs Winston: Which Node.js Logger Should You Use?"
primary_keyword: "pino vs winston"
breadcrumbs: [{ name: "Home", url: "/" }, { name: "Comparisons", url: "/comparisons/" }, { name: "Pino vs Winston", url: "/comparisons/pino-vs-winston/" }]
schema: ["TechArticle", "BreadcrumbList", "FAQPage"]
author: "DevX Tools"
datePublished: "2026-10-15"
dateModified: "2026-10-15"
tested_with: "pino 10.4.0, pino-pretty 13.2.0, pino-http 11.0.0, winston 3.19.0, winston-daily-rotate-file 5.0.0, express-winston 4.2.0, Fastify 5.12.7, Express 5.3.0, NestJS 12.1.3 with nestjs-pino 5.3.1 and nest-winston 2.0.0, @opentelemetry/sdk-node 0.223.0, Node 22.23.3; 2026-10-15"
tools: ["pino", "winston", "grafana-loki", "betterstack", "datadog", "opentelemetry"]
---

**Pino vs Winston is a choice between speed with structured JSON by default (Pino) and in-process flexibility (Winston).** Both are mature, MIT-licensed Node.js loggers. They differ in where formatting and shipping happen, and in how much you configure yourself.

> **Tested with** pino 10.4.0 and winston 3.19.0 on Node 22.23.3 (2026-10-15), plus Fastify 5.12.7, Express 5.3.0 and NestJS 12.1.3. Every snippet and output below comes from runs on our test machine. devxtools.dev is independent and has no relationship with either project.

## TL;DR

Pick **Pino** for most new Node.js services. It's faster, writes newline-delimited JSON by default, and moves formatting and shipping into worker-thread transports. Fastify uses it out of the box. Pick **Winston** if you need many in-process transports, custom formats or custom levels, or if you're maintaining an existing Winston codebase.

## At a glance

| | Pino | Winston |
|---|---|---|
| Default output | Newline-delimited JSON with numeric levels and an epoch-ms `time` | Whatever your `format` chain builds (JSON, text, colourised) |
| Performance focus | Very low overhead: about 2× Winston's throughput in our test (200,000 object logs to `/dev/null`, Node 22.23.3, 8 vCPU; median of 5 runs; see Performance) | Flexibility first |
| Transports | Worker-thread transports (`pino.transport`), multiple targets | Built-in Console/File/Http/Stream plus many community transports, in-process |
| Redaction | Built in (`redact` paths, wildcards) | Write a custom format |
| Error objects | `err` serializer: type, message, stack | `format.errors({ stack: true })`; Errors nested in metadata can serialize to `{}` |
| Pretty dev output | `pino-pretty` (transport or CLI pipe) | `format.colorize()` + `format.simple()` |
| Framework support | Fastify default; `pino-http`; `nestjs-pino` | `express-winston`; `nest-winston` |
| OpenTelemetry | `@opentelemetry/instrumentation-pino` | `@opentelemetry/instrumentation-winston` |
| Weekly npm downloads (Oct 6–12, 2026) | ~54.4M | ~27.4M |
| GitHub stars (2026-10-15) | 18,247 | 24,524 |
| Licence | MIT | MIT |

## Same setup in both

The same requirements in each library: JSON output, a per-request child logger, a redacted password, a logged error, and pretty output in development.

### Basic JSON logger, child loggers and redaction

**Pino**

```js
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: { paths: ['password', 'req.headers.authorization', 'user.*.token'], censor: '[REDACTED]' },
});

logger.info({ userId: 42 }, 'user signed in');

const reqLog = logger.child({ requestId: 'abc-123' });
reqLog.info({ password: 'hunter2', user: { a: { token: 't0k' } } }, 'login attempt');
```

Output:

```json
{"level":30,"time":1792077807632,"pid":1861286,"hostname":"…","userId":42,"msg":"user signed in"}
{"level":30,"time":1792077807633,"pid":1861286,"hostname":"…","requestId":"abc-123","password":"[REDACTED]","user":{"a":{"token":"[REDACTED]"}},"msg":"login attempt"}
```

**Winston**

```js
import winston from 'winston';
const { combine, timestamp, errors, json } = winston.format;

// Winston has no built-in redaction: a small custom format does it.
const redact = winston.format((info) => {
  if (info.password) info.password = '[REDACTED]';
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: combine(redact(), errors({ stack: true }), timestamp(), json()),
  transports: [new winston.transports.Console()],
});

logger.info('user signed in', { userId: 42 });

const reqLog = logger.child({ requestId: 'abc-123' });
reqLog.info('login attempt', { password: 'hunter2' });
```

Output:

```json
{"level":"info","message":"user signed in","timestamp":"2026-10-15T15:23:27.726Z","userId":42}
{"level":"info","message":"login attempt","password":"[REDACTED]","requestId":"abc-123","timestamp":"2026-10-15T15:23:27.728Z"}
```

Three differences matter when you switch between the two:

1. **Argument order.** Pino takes `(object, message)`, while Winston takes `(message, meta)`.
2. **Levels.** Pino writes numeric levels (`30` = info, `50` = error) and Winston writes strings. Pino's default levels are trace, debug, info, warn, error and fatal. Winston uses npm levels, from `error: 0` to `silly: 6`. Both support custom levels.
3. **Redaction.** Pino's `redact` uses fast path matching with wildcards (`user.*.token`). In Winston, you write and maintain the redaction function yourself, including nested paths.

### Logging errors

```js
// Pino: pass the error under `err` — the standard serializer keeps type, message and stack
reqLog.error({ err }, 'failed to parse body');
// {"level":50,…,"err":{"type":"SyntaxError","message":"Expected property name…","stack":"SyntaxError: …"},"msg":"failed to parse body"}

// Winston: nested in metadata, the Error lost everything
reqLog.error('failed to parse body', { error: err });
// {"error":{},"level":"error","message":"failed to parse body",…}

// Winston: pass the Error itself (with format.errors({ stack: true })) to keep message and stack
reqLog.error(err);
// {"level":"error","message":"Expected property name…","stack":"SyntaxError: …",…}
```

The `{"error":{}}` line is a classic Winston pitfall. `Error` properties aren't enumerable, so `JSON.stringify` drops them. Pass the error itself, or add a format that copies `message` and `stack` across.

### Pretty logs in development

Pino keeps pretty printing out of the hot path. Either pipe the output through the CLI (`node app.js | npx pino-pretty`) or add it as a transport target. Here, one Pino logger writes pretty output to the console and JSON to a file:

```js
import pino from 'pino';

const transport = pino.transport({
  targets: [
    { target: 'pino-pretty', level: 'debug', options: { colorize: false } },        // dev console
    { target: 'pino/file', level: 'info', options: { destination: './logs/app.log', mkdir: true } },
  ],
});

const logger = pino({ level: 'debug', timestamp: pino.stdTimeFunctions.isoTime }, transport);
logger.info({ orderId: 7 }, 'order created');
// console:  [17:23:36.348] INFO (1861429): order created
//               orderId: 7
// app.log:  {"level":30,"time":"2026-10-15T15:23:36.348Z",…,"orderId":7,"msg":"order created"}
```

Winston does the same thing with a format per transport. It also has daily log rotation through `winston-daily-rotate-file`:

```js
import winston from 'winston';
import 'winston-daily-rotate-file';
const { combine, timestamp, json, colorize, simple } = winston.format;

const logger = winston.createLogger({
  level: 'debug',
  format: combine(timestamp(), json()),
  transports: [
    new winston.transports.Console({ format: combine(colorize(), simple()) }), // dev console
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/app-%DATE%.log', datePattern: 'YYYY-MM-DD', maxFiles: '14d', level: 'info',
    }),
  ],
});
```

Pino generally leaves rotation to the environment: logrotate, or the container runtime collecting stdout.

## Performance

**Pino's own benchmarks** (docs/benchmarks.md in the Pino repo) report these averages:
- A basic string log: 114.8 ms for Pino vs 270.2 ms for Winston.
- A small object: 119.3 ms vs 273.1 ms.

The same page shows that on a deep nested object, Bunyan (1.8 ms) beat Pino (2.3 ms), and Winston took 5.6 ms. The page doesn't state the hardware or versions used, so read those figures as Pino's claims.

**Our own run:**
- **Workload:** 200,000 `info` calls, each with a three-field object.
- **Pino setup:** `pino()`.
- **Winston setup:** `createLogger` with `timestamp()` + `json()` and a Console transport.
- **Output:** stdout redirected to `/dev/null`.
- **Environment:** Node 22.23.3 on an 8-vCPU / 16 GB Linux VM.
- **Method:** five alternating runs, timed until process exit.

| | Median time | Throughput | Peak RSS |
|---|---|---|---|
| pino 10.4.0 | 861 ms | ~232,000 lines/s | ~157 MB |
| winston 3.19.0 | 1,719 ms | ~116,000 lines/s | ~389 MB |

That's roughly 2× in Pino's favour, in line with Pino's published ratio. Winston does slightly more work in this setup: it formats an ISO timestamp, while Pino writes epoch milliseconds. In a real service, logging rarely dominates unless you log on every request at high volume. That's exactly the case where the gap matters, though.

## Transports and where logs go

- **Pino** encourages logging to stdout and letting the platform ship the logs. When you do want in-app shipping, `pino.transport()` runs the targets in a **worker thread**, so serialization for remote backends stays off the main event loop.
- **Winston** transports run in-process. That's simple to reason about, and there's a large catalog of them.

| Destination | Pino | Winston |
|---|---|---|
| File | `pino/file` target (built in) | `transports.File`, `winston-daily-rotate-file` |
| [Grafana Loki](/tools/grafana-loki/) | `pino-loki` (229K/week) | `winston-loki` (217K/week) |
| [Better Stack](/tools/betterstack/) | `@logtail/pino` | `@logtail/winston` |
| [Datadog](/tools/datadog/) | JSON to file/stdout + Agent | JSON to file + Agent, or `transports.Http` to the intake (agentless) |
| OpenTelemetry Logs SDK | "Log sending" in `instrumentation-pino` (pino ≥7) | `@opentelemetry/winston-transport` |

We sent one log line from each library to a stub Loki endpoint. Both posted a valid `/loki/api/v1/push` payload, with labels `{ app: 'api', level: 'info' }`:

```js
// Pino → Loki (runs in a worker thread)
const logger = pino(pino.transport({
  target: 'pino-loki',
  options: { host: 'http://localhost:3100', labels: { app: 'api' }, batching: false },
}));

// Winston → Loki
import LokiTransport from 'winston-loki';
const wlog = winston.createLogger({
  transports: [new LokiTransport({ host: 'http://localhost:3100', labels: { app: 'api' }, json: true, batching: false })],
});
```

Keep batching on in production; we turned it off only to see requests immediately. Datadog's Node.js log collection guide recommends logging to a file and tailing it with the Datadog Agent. It names Winston, Bunyan and Pino, but its examples use Winston.

## Framework integration

**Fastify** uses Pino as its built-in logger. With `Fastify({ logger: true })` (or an options object, including `redact`), you get `request.log` with a `reqId` plus "incoming request" / "request completed" lines. Fastify's default request serializer doesn't log headers.

**Express:** `pino-http` adds `req.log` and one completion line per request. Note that its default serializer logs **all request headers, including `authorization`**; we saw `"authorization":"Bearer x"` in the output. Add `redact: ['req.headers.authorization', 'req.headers.cookie']`. For Winston, `express-winston` is the equivalent request logger (`expressWinston.logger({ transports, format, msg })`).

**NestJS:** both integrations worked on NestJS 12.1.3.

```ts
// nestjs-pino: request-scoped context on every log line
@Module({
  imports: [LoggerModule.forRoot({ pinoHttp: { level: 'info', redact: ['req.headers.authorization'] } })],
})
class AppModule {}

const app = await NestFactory.create(AppModule, { bufferLogs: true });
app.useLogger(app.get(Logger)); // Logger from 'nestjs-pino'
// in a provider: constructor(@InjectPinoLogger(AppController.name) private readonly logger: PinoLogger) {}
```

```ts
// nest-winston
@Module({
  imports: [WinstonModule.forRoot({
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [new winston.transports.Console()],
  })],
})
class AppModule {}

const app = await NestFactory.create(AppModule, { bufferLogs: true });
app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
// {"context":"AppController","level":"info","message":"handler log","timestamp":"…"}
```

The practical difference: `nestjs-pino` attaches the request (id, method, url, headers) to every log line written during that request without extra code. `nest-winston` gives you Nest's `context` field, and request context is up to you. Weekly downloads are 2.99M for `nestjs-pino` and 1.10M for `nest-winston`.

## Correlating logs with traces

Both libraries have official OpenTelemetry instrumentations. Once registered, they add `trace_id`, `span_id` and `trace_flags` to every log line written inside an active span. In an ES-module app, you also need the instrumentation loader hook:

```js
// otel.js: load first with: node --import ./otel.js app.js
import { register } from 'node:module';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';

// ESM apps need the loader hook so instrumentations can patch imported modules
register('@opentelemetry/instrumentation/hook.mjs', import.meta.url);

const sdk = new NodeSDK({
  instrumentations: [new PinoInstrumentation(), new WinstonInstrumentation()],
});
sdk.start();
```

> **SDK 0.300 note (2026-10-21):** this was tested on `@opentelemetry/sdk-node` 0.223.0. [Version 0.300.0](https://github.com/open-telemetry/opentelemetry-js/releases/tag/experimental%2Fv0.300.0) (released 2026-10-20) requires Node.js 22.15 or later and removes the `metricReader`, `spanProcessor` and `logRecordProcessor` options in favour of the plural `metricReaders`, `spanProcessors` and `logRecordProcessors`. We haven't re-run this page on 0.300 yet.

Inside a span, the output looked like this:

```json
{"level":30,…,"trace_id":"6843f258ee411382922ae22886e367f5","span_id":"0307fc804734ac6c","trace_flags":"01","msg":"from pino"}
{"level":"info","message":"from winston","span_id":"0307fc804734ac6c","trace_flags":"01","trace_id":"6843f258ee411382922ae22886e367f5"}
```

Without the `register(...)` line, our ESM app produced logs with no trace fields at all, and no error. As of 2026-10-15, `@opentelemetry/instrumentation-pino` 0.69.0 supports pino `>=5.14.0 <11`, which covers the current pino 10.4. Both instrumentations can also forward records to the OpenTelemetry Logs SDK ("log sending"); Winston needs `@opentelemetry/winston-transport` installed for that. See [OpenTelemetry](/tools/opentelemetry/).

## Migrating from Winston to Pino

| Winston | Pino |
|---|---|
| `winston.createLogger({ level, format, transports })` | `pino({ level, redact, serializers }, transport)` |
| `logger.info('msg', { a: 1 })` | `logger.info({ a: 1 }, 'msg')` |
| `logger.error(err)` | `logger.error({ err }, 'what failed')` or `logger.error(err)` |
| `logger.child({ requestId })` | `logger.child({ requestId })` |
| `format.timestamp()` | `timestamp: pino.stdTimeFunctions.isoTime` |
| `format.colorize()`, `simple()` | `pino-pretty` |
| `transports.File` | `pino/file` target |
| `verbose`, `silly` levels | `customLevels: { verbose: 25 }` or map to `debug`/`trace` |
| custom redaction format | `redact: { paths: [...] }` |

The argument-order swap is the change most likely to slip through code review. `logger.info('msg', { a: 1 })` still runs in Pino, but the object is treated as a format argument. With no `%o`/`%j` placeholder in the message, it's silently dropped: our test printed only `"msg":"msg"`, with no `a` field. Change call sites module by module, and keep dashboards that parse `level` as a string in mind, because Pino writes numbers unless you add a `formatters.level` function.

Bunyan, the third classic option, is still downloaded, but its latest release is 1.8.15. Plain `console.log` in production gives you no levels, no structure and no redaction. Any of the three is better than that.

## Verdict

- **New service, especially Fastify or NestJS:** Pino with `pino-http` or `nestjs-pino`, `pino-pretty` in dev, and stdout or worker-thread transports in production.
- **Existing Winston codebase, or several in-process destinations with different formats:** stay on Winston. Add `format.errors({ stack: true })` and a redaction format.
- **Either way:** turn on the OpenTelemetry instrumentation so your logs carry trace IDs.

## FAQ

### Is Pino faster than Winston?
Yes, in both Pino's own benchmarks and our test. Pino's docs report about 115 ms vs 270 ms for a basic log benchmark. In our run of 200,000 object logs on Node 22, Pino took a median of 861 ms and Winston 1,719 ms, roughly 2× faster.

### Should I use Pino or Winston with NestJS?
Both work: `nestjs-pino` and `nest-winston` both ran on NestJS 12.1.3. Choose `nestjs-pino` if you want request context (id, method, URL) on every log line automatically. Choose `nest-winston` if your team already standardises on Winston formats and transports.

### How do I pretty-print Pino logs?
Pipe the output through `pino-pretty` (`node app.js | npx pino-pretty`), or add `{ target: 'pino-pretty' }` to `pino.transport()` in development. Keep JSON in production.

### How do I redact sensitive fields?
In Pino, pass `redact: ['password', 'req.headers.authorization', 'user.*.token']` (wildcards supported, with an optional `censor` value). Winston has no built-in redaction, so you add a custom `winston.format` that replaces those fields before `json()`.

### Can I send Pino or Winston logs to Grafana Loki?
Yes. Use the `pino-loki` transport, which runs in a worker thread, or `winston-loki`. Both posted valid payloads to `/loki/api/v1/push` in our test. Alternatively, log JSON to stdout and let Grafana Alloy or another collector ship it.

### How do I migrate from Winston to Pino?
Swap `logger.info('msg', meta)` for `logger.info(meta, 'msg')`, and replace formats with Pino options (`timestamp`, `redact`, `formatters`). Replace transports with `pino.transport` targets, and map Winston-only levels such as `verbose` and `silly` to custom levels or debug/trace.

## Related

- [Pino](/tools/pino/) · [Winston](/tools/winston/) · [Grafana Loki](/tools/grafana-loki/) · [Better Stack](/tools/betterstack/) · [Datadog](/tools/datadog/) · [OpenTelemetry](/tools/opentelemetry/) · [Sentry](/tools/sentry/)
- [Observability hub](/observability/)

## Sources

- Pino docs (API, redaction, transports run in worker threads, pino-pretty): https://getpino.io/ · https://github.com/pinojs/pino/blob/main/docs/transports.md
- Pino benchmarks: https://github.com/pinojs/pino/blob/main/docs/benchmarks.md
- Winston README (formats, levels, transports, child loggers): https://github.com/winstonjs/winston
- winston-daily-rotate-file: https://github.com/winstonjs/winston-daily-rotate-file
- Fastify logging: https://fastify.dev/docs/latest/Reference/Logging/
- pino-http: https://github.com/pinojs/pino-http · express-winston: https://github.com/bithavoc/express-winston
- nestjs-pino: https://github.com/iamolegga/nestjs-pino · nest-winston: https://github.com/gremo/nest-winston
- OpenTelemetry pino instrumentation (supported versions, log sending): https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-pino
- OpenTelemetry winston instrumentation: https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-winston
- pino-loki: https://github.com/Julien-R44/pino-loki · winston-loki: https://github.com/JaniAnttonen/winston-loki
- Better Stack transports: https://www.npmjs.com/package/@logtail/pino · https://www.npmjs.com/package/@logtail/winston
- Datadog Node.js log collection: https://docs.datadoghq.com/logs/log_collection/nodejs/
- npm weekly downloads (2026-10-06 to 2026-10-12): https://api.npmjs.org/downloads/point/last-week/pino,winston (and per package)
- GitHub repository metadata (stars, licences), fetched 2026-10-15: pinojs/pino, winstonjs/winston
- Our runs: /workspace/logtest and /workspace/nestlog on the box, 2026-10-15
