---
title: "OpenTelemetry vs Prometheus: Differences & When to Use Both"
description: "OpenTelemetry vs Prometheus explained: instrumentation standard vs metrics database, push vs pull, OTLP ingestion, and a Node.js setup using both together."
slug: "/comparisons/opentelemetry-vs-prometheus/"
canonical: "https://devxtools.dev/comparisons/opentelemetry-vs-prometheus/"
h1: "OpenTelemetry vs Prometheus: Not Rivals, Different Layers"
primary_keyword: "opentelemetry vs prometheus"
breadcrumbs: [{ name: "Home", url: "/" }, { name: "Comparisons", url: "/comparisons/" }, { name: "OpenTelemetry vs Prometheus", url: "/comparisons/opentelemetry-vs-prometheus/" }]
schema: ["TechArticle", "BreadcrumbList", "FAQPage"]
author: "DevX Tools"
datePublished: "2026-10-15"
dateModified: "2026-10-15"
tested_with: "Prometheus 3.15.0, OpenTelemetry Collector Contrib 0.162.0, @opentelemetry/sdk-node 0.223.0, @opentelemetry/exporter-prometheus 0.223.0, @opentelemetry/exporter-metrics-otlp-proto 0.223.0, @opentelemetry/auto-instrumentations-node 0.81.0, prom-client 15.1.3, Express 5.3.0, Node 22.23.3; 2026-10-15"
tools: ["opentelemetry", "grafana-loki", "datadog", "sentry", "pino"]
---

**OpenTelemetry vs Prometheus isn't really an either/or choice: OpenTelemetry is how your app *produces and ships* telemetry, and Prometheus is a system that *stores, queries and alerts on* metrics.** They overlap in one place, metrics instrumentation and collection, and that's where you have real decisions to make. This guide explains the layers, then wires up a Node.js app three ways and shows the gotchas we hit.

> **Tested with** Prometheus 3.15.0, OpenTelemetry Collector Contrib 0.162.0, the OpenTelemetry JS SDK 0.223.0 and prom-client 15.1.3 on Node 22.23.3 with Express 5.3.0 (2026-10-15). Every config and snippet below ran on our test machine, and the outputs are real. devxtools.dev is independent. Both projects are open source under the CNCF, and nobody sponsored this page.

## TL;DR

OpenTelemetry is a vendor-neutral standard and toolkit for producing and shipping traces, metrics and logs. Prometheus is a metrics database and monitoring system that stores, queries and alerts on metrics. They're complementary: many teams instrument with OpenTelemetry and send the metrics to Prometheus.

**Quick decision:** if you only need metrics and dashboards for a Node service, `prom-client` plus Prometheus is the simplest setup. If you also want traces, or want to keep the option of switching backends, instrument with OpenTelemetry and send metrics to Prometheus, either scraped or over OTLP.

## What each one is

**[OpenTelemetry](/tools/opentelemetry/) (OTel)** is a specification plus implementations:

- **APIs and SDKs** for each language (in Node: `@opentelemetry/api`, `@opentelemetry/sdk-node`) to create spans, metrics and logs.
- **Auto-instrumentation** (`@opentelemetry/auto-instrumentations-node`) that instruments HTTP, Express, database clients and more without code changes.
- **OTLP**, the wire protocol (gRPC on 4317, HTTP on 4318) that most observability backends now accept.
- **The Collector**, a standalone agent/gateway with *receivers* (OTLP, Prometheus scraping and many others), *processors* (batching, filtering, sampling, attribute changes) and *exporters* (Prometheus, remote write, OTLP to vendors).

OTel has **no storage, no query language, no dashboards and no alerting**. It always exports to something else.

**Prometheus** is a monitoring system:

- A **time-series database** for metrics.
- A **scraper** that pulls `/metrics` endpoints on an interval (the pull model).
- **PromQL** for queries, plus **alerting rules** that fire into **Alertmanager**.
- An ecosystem of **exporters** (node_exporter and so on) and **client libraries** (for Node, `prom-client`).
- **Remote write** for long-term or scaled storage (Mimir, Thanos, Cortex), and since Prometheus 3.x an optional **OTLP receiver**.

Prometheus handles **metrics only**: no traces, no logs.

## At a glance

| | OpenTelemetry | Prometheus |
|---|---|---|
| What it is | Instrumentation standard + SDKs + Collector | Metrics TSDB + scraper + query + alerting |
| Signals | Traces, metrics, logs | Metrics only |
| Storage/backend | None (export to a backend) | Built-in time-series DB |
| Collection | Push (OTLP) or pull | Pull (scrape); OTLP ingest optional |
| Query language | None | PromQL |
| Alerting | No | Alertmanager |
| Node.js library | `@opentelemetry/sdk-node` (+ auto-instrumentation) | `prom-client` |
| Weekly npm downloads (Oct 2026) | ~20.0M (`sdk-node`) | ~10.0M (`prom-client`) |
| Governance | CNCF | CNCF |

## How they fit together

```text
                ┌──────────── traces ────────────► Tempo / Jaeger
Node app        │
(OTel SDK) ──OTLP──► OTel Collector ──── metrics ──► Prometheus (remote write or OTLP) ──► Grafana
                │                                         ▲
                └──────────── logs ──────────────► Loki   │ scrape
                                                          │
Other services exposing /metrics (prom-client, exporters) ┘
```

In this picture Prometheus is one **backend** among several, and OpenTelemetry is the **plumbing**. Grafana sits on top and queries Prometheus (PromQL), Tempo (traces) and [Loki](/tools/grafana-loki/) (logs). Swap Prometheus for a SaaS backend and the app doesn't change, which is the main reason to instrument with OTel.

## Push vs pull: OTLP vs scraping

- **Pull (Prometheus' model):** each app exposes `/metrics`, and Prometheus scrapes every N seconds. The `up` metric tells you whether a target is reachable, and Prometheus controls the load. It needs service discovery and network reachability from Prometheus to every target.
- **Push (OTLP):** the app or Collector sends metrics on its own schedule. This suits short-lived jobs, serverless, and networks where the backend can't reach the app.

Since Prometheus 3.x you can do either. Start Prometheus with `--web.enable-otlp-receiver` and it accepts OTLP/HTTP metrics at `/api/v1/otlp/v1/metrics`. Or keep the Collector in the middle and use its `prometheusremotewrite` exporter (Prometheus needs `--web.enable-remote-write-receiver`). The Collector can also *scrape* existing `/metrics` endpoints with its Prometheus receiver, so it can bridge both models.

## Instrumenting a Node.js app three ways

All three ran against Express 5.3.0 on Node 22.23.3.

### 1. prom-client only (pull)

```js
// a-promclient.js
import express from 'express';
import client from 'prom-client';

client.collectDefaultMetrics();
const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'HTTP requests',
  labelNames: ['route', 'status'],
});

const app = express();
app.get('/api/users', (req, res) => {
  httpRequests.inc({ route: '/api/users', status: 200 });
  res.json([{ id: 1 }]);
});
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
app.listen(3001);
```

```yaml
# prometheus.yml
scrape_configs:
  - job_name: users-api-promclient
    static_configs:
      - targets: ['localhost:3001']
```

After two requests, PromQL `http_requests_total` returned `{job="users-api-promclient", route="/api/users", status="200"} 2`. This is simple and battle-tested, with default process and Node.js runtime metrics included. The trade-offs: you instrument every route yourself, there are no traces, and the code is Prometheus-specific.

### 2. OpenTelemetry SDK + Prometheus exporter (pull)

Keep Prometheus scraping, but instrument with OTel. The Prometheus exporter serves `/metrics` on its own port (9464 by default):

```js
// otel-prom.js — load before the app: node --import ./otel-prom.js app.js
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';

const sdk = new NodeSDK({
  resource: resourceFromAttributes({ 'service.name': 'users-api' }),
  metricReader: new PrometheusExporter({ port: 9464 }),
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

```js
// app.js — custom metrics use the vendor-neutral OTel API
import express from 'express';
import { metrics } from '@opentelemetry/api';

const orders = metrics.getMeter('users-api').createCounter('orders_created', { description: 'Orders created' });
const app = express();
app.get('/api/users', (req, res) => { orders.add(1, { plan: 'free' }); res.json([{ id: 1 }]); });
app.listen(3002);
```

With no manual HTTP instrumentation, `localhost:9464/metrics` included `http_server_request_duration` histograms (method, status code and scheme labels), our `orders_created_total` counter, and a `target_info` series carrying resource attributes (`service_name`, `host_name`, `process_runtime_version`…). This is a good stepping stone: same Prometheus, but your code now speaks OTel.

### 3. OpenTelemetry SDK → OTLP → Prometheus (push), with or without a Collector

```js
// otel-otlp.js
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';

const sdk = new NodeSDK({
  resource: resourceFromAttributes({ 'service.name': 'users-api' }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: process.env.OTLP_METRICS_URL }),
    exportIntervalMillis: 5000,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

**Direct to Prometheus:** start Prometheus with the OTLP receiver and set `OTLP_METRICS_URL=http://localhost:9090/api/v1/otlp/v1/metrics`:

```bash
prometheus --config.file=prometheus.yml --web.enable-otlp-receiver
```

```yaml
# prometheus.yml (addition)
otlp:
  promote_resource_attributes: [service.name]
```

**Via the Collector** (our recommendation once you also ship traces or logs): set `OTLP_METRICS_URL=http://localhost:4318/v1/metrics` and use this config (validated and run with `otelcol-contrib` 0.162.0):

```yaml
receivers:
  otlp:
    protocols:
      http: { endpoint: 0.0.0.0:4318 }
      grpc: { endpoint: 0.0.0.0:4317 }
processors:
  batch: {}
exporters:
  prometheusremotewrite:
    endpoint: http://localhost:9090/api/v1/write   # Prometheus needs --web.enable-remote-write-receiver
service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheusremotewrite]
```

Both paths landed in the same Prometheus. `orders_created_total` showed up as `{job="users-api", service_name="users-api", plan="free"}` from the direct path (thanks to `promote_resource_attributes`) and as `{job="users-api", otel_scope_name="users-api", plan="free"}` via the Collector. In both cases `job` came from `service.name`, and auto-instrumented histograms arrived as `http_server_request_duration_seconds_*`.

## Gotchas we hit (and how to fix them)

**1. Metric names change depending on the path.** The same OTel histogram was called `http_server_request_duration` via the JS Prometheus exporter (unit only in a `# UNIT` line), but `http_server_request_duration_seconds_bucket` via OTLP into Prometheus. Counters got a `_total` suffix on both paths (`orders_created` became `orders_created_total`). Pick one path per metric, or dashboards break when you switch. On the OTLP receiver, Prometheus' `otlp.translation_strategy` controls this. The default, `UnderscoreEscapingWithSuffixes`, escapes dots to underscores and appends unit and type suffixes. Other strategies keep UTF-8 names (Prometheus 3 supports UTF-8 metric and label names) but can cause collisions without suffixes.

**2. Delta temporality is rejected by default.** Prometheus stores cumulative counters. When we sent a delta-temporality counter from the Node SDK, the exporter printed **nothing**. Prometheus logged `invalid temporality and type combination for metric "delta_orders"` and stored no data. After a restart with `--enable-feature=otlp-deltatocumulative` (experimental), the same script produced `delta_orders_total = 5`. The OTel JS SDK defaults to cumulative, so this mostly bites when a vendor setup or env var (`OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=delta`) switches it.

**3. Resource attributes live on `target_info`.** Prometheus maps `service.name` to `job` and `service.instance.id` to `instance`. All other resource attributes (`host.name`, `k8s.cluster.name`…) go onto a separate `target_info` series, not onto every metric. Either promote the few you filter on (`otlp.promote_resource_attributes`), or join at query time:

```promql
rate(http_server_request_duration_seconds_count[2m])
  * on (job, instance) group_left (k8s_cluster_name) target_info
```

Prometheus' docs recommend the experimental `info()` PromQL function over raw joins, because joins can briefly fail when `target_info` labels churn.

**4. Out-of-order samples with a Collector in front.** Prometheus' OTLP guide recommends enabling `storage.tsdb.out_of_order_time_window` (for example `30m`), because batched or retried pushes can arrive out of order.

**5. Cardinality is your problem in both worlds.** Every unique label combination is a time series. Auto-instrumentation records `http.route`, method and status, which is fine. Adding `user.id` or a raw URL as an attribute creates a series per user. Use Collector processors (`filter`, `attributes`, `transform`) or OTel SDK *views* to drop or bucket high-cardinality attributes before they reach Prometheus.

**6. Two instrumentations double-count.** If you add OTel auto-instrumentation to a service that already uses `prom-client` HTTP middleware, you get two request-duration metrics with different names. Remove one.

## When to use only Prometheus, only OTel, or both

- **Only Prometheus (+ prom-client and exporters):** metrics-only monitoring, a team fluent in PromQL, infrastructure exporters (node_exporter, databases), and no plans for tracing. This has the lowest moving-part count.
- **Only OpenTelemetry (with a non-Prometheus backend):** you send everything to a SaaS or an all-in-one backend (Grafana Cloud, SigNoz, Honeycomb, [Datadog](/tools/datadog/) and others accept OTLP) and don't run Prometheus at all. OTel keeps the backend swappable.
- **Both (the common answer):** instrument with OTel for traces, metrics and logs, and use Prometheus (or Mimir) as the metrics store with Grafana on top. Scrape OTel's Prometheus exporter if you like pull, or push OTLP through a Collector if you also ship traces and logs. Keep `prom-client` for services that are already instrumented and working.

For a Node.js team starting fresh, we'd use option 3 (OTel SDK → Collector → Prometheus remote write), with traces going to Tempo or a vendor and logs from [Pino](/tools/pino/) going to Loki.

## FAQ

### Is OpenTelemetry a replacement for Prometheus?
No. OpenTelemetry produces and transports telemetry but has no storage, query language, dashboards or alerting. It can replace Prometheus *client libraries* (such as prom-client) for instrumentation, but you still need a backend, and Prometheus is a common one.

### Can Prometheus receive OpenTelemetry data?
Yes. Start Prometheus 3.x with `--web.enable-otlp-receiver` and send OTLP/HTTP metrics to `/api/v1/otlp/v1/metrics`. Alternatively, have the OpenTelemetry Collector push with the `prometheusremotewrite` exporter, or let Prometheus scrape an OTel Prometheus exporter endpoint. We ran all three on Prometheus 3.15.0.

### Should I use prom-client or OpenTelemetry in Node.js?
Use prom-client if you only need Prometheus metrics and want the simplest, mature setup. Use the OpenTelemetry SDK if you also want traces, want auto-instrumentation of HTTP and database calls, or want to switch backends without changing code. You can migrate gradually. They can coexist, but don't instrument the same thing twice.

### Is OpenTelemetry free and open source?
Yes. OpenTelemetry's specification, SDKs and Collector are open source (Apache-2.0) and governed under the CNCF. Costs come from where you send the data: self-hosted backends cost infrastructure, and SaaS backends charge by usage.

### What is the OpenTelemetry Collector?
A standalone service that receives telemetry (OTLP, Prometheus scrapes and more), processes it (batching, filtering, sampling, renaming, dropping attributes) and exports it to one or more backends. It decouples your apps from your backends and is the usual place to fix cardinality and route data.

### OpenTelemetry vs Prometheus vs Grafana: what's the difference?
OpenTelemetry instruments and ships telemetry. Prometheus stores and queries metrics, and alerts on them. Grafana visualizes data from Prometheus and other sources (Tempo for traces, Loki for logs). A typical open-source stack uses all three: OTel produces, Prometheus stores metrics, and Grafana displays them.

## Related

- [OpenTelemetry](/tools/opentelemetry/) · [Grafana Loki](/tools/grafana-loki/) · [Pino](/tools/pino/)
- [Datadog](/tools/datadog/) · [Sentry](/tools/sentry/)
- [Observability tools](/observability/)

## Sources

All accessed 2026-10-15.

- Prometheus, "Using Prometheus as your OpenTelemetry backend" (OTLP receiver, promote_resource_attributes, target_info, translation strategies, delta temporality, out-of-order): https://prometheus.io/docs/guides/opentelemetry/
- Prometheus CLI flags (`--web.enable-otlp-receiver`, `--web.enable-remote-write-receiver`, feature flags), checked via `prometheus --help` on 3.15.0: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- OpenTelemetry blog, "Prometheus and OpenTelemetry: Better Together": https://opentelemetry.io/blog/2024/prom-and-otel/
- OpenTelemetry Prometheus compatibility spec: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry JS: https://github.com/open-telemetry/opentelemetry-js; Node getting started: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- Collector `prometheusremotewrite` exporter: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/prometheusremotewriteexporter
- Collector Prometheus receiver: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/prometheusreceiver
- prom-client: https://github.com/siimon/prom-client
- npm downloads API (week of Oct 6–12, 2026): @opentelemetry/sdk-node, prom-client
