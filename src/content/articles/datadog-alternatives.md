---
title: "Datadog Alternatives (2026): Open-Source & Cheaper Options"
description: "Independent guide to Datadog alternatives: open-source and SaaS tools for APM, logs, metrics and errors, with pricing models and an OpenTelemetry plan."
slug: "/observability/datadog-alternatives/"
canonical: "https://devxtools.dev/observability/datadog-alternatives/"
h1: "Datadog Alternatives: Open-Source and Cheaper Options by Job"
primary_keyword: "datadog alternatives"
breadcrumbs: [{ name: "Home", url: "/" }, { name: "Observability", url: "/observability/" }, { name: "Datadog Alternatives", url: "/observability/datadog-alternatives/" }]
schema: ["TechArticle", "ItemList", "BreadcrumbList", "FAQPage"]
author: "DevX Tools"
datePublished: "2026-10-15"
dateModified: "2026-10-15"
tested_with: "OpenTelemetry Collector Contrib 0.162.0 (config validation plus a local OTLP → Prometheus run), Prometheus 3.15.0, @opentelemetry/sdk-node 0.223.0, Node 22.23.3; vendor prices and GitHub data checked 2026-10-15"
tools: ["datadog", "opentelemetry", "grafana-loki", "sentry", "betterstack", "pino", "winston"]
---

**The best Datadog alternatives depend on which Datadog job you're replacing: APM and tracing, logs, infrastructure metrics, error tracking, RUM or uptime.** No single tool is cheapest at all six. This guide maps an open-source and a SaaS option to each job, explains the pricing models that drive the bill, and shows how to move with OpenTelemetry so you only change backends once.

> **Tested with** OpenTelemetry Collector Contrib 0.162.0, Prometheus 3.15.0 and the OpenTelemetry Node SDK 0.223.0 on Node 22.23.3 (2026-10-15). We validated the Collector configs on this page and sent OTLP metrics from a Node service into Prometheus on our test machine. We did **not** run a production trial of any vendor below. Prices come from vendor pricing pages on 2026-10-15. devxtools.dev is independent, has no affiliate or sponsorship deal with any observability vendor, and none of them reviewed this page.

## TL;DR

The strongest open-source Datadog alternatives are **SigNoz** (all-in-one and OpenTelemetry-native) and the **Grafana stack** (Prometheus or Mimir, Loki and Tempo) if you want composable parts. **Sentry** and **Better Stack** cover error tracking and logs more cheaply for small teams. Instrument with **OpenTelemetry** first so you can switch backends without re-instrumenting.

**Quick picks (checked 2026-10-15):**

- **All-in-one, self-hosted:** SigNoz or OpenObserve
- **Composable and widely documented:** the Grafana stack (Prometheus/Mimir, Loki, Tempo, Grafana)
- **Errors and frontend issues:** Sentry
- **Logs plus uptime and on-call for a small team:** Better Stack, or Loki if you self-host
- **Small team that wants zero ops and a real free tier:** Grafana Cloud (free tier: 10k metric series, 50 GB logs, 50 GB traces, 14-day retention)

## At a glance

| Tool | Type | Signals | Self-host | OTel-native | Pricing model (managed) |
|---|---|---|---|---|---|
| SigNoz | OSS + cloud | Logs, metrics, traces, exceptions | Yes | Yes | Per GB (logs, traces) and per million metric samples |
| Grafana stack | OSS + Grafana Cloud | Logs, metrics, traces, profiles | Yes | Yes (OTLP ingest) | Free tier, then Pro $19/mo plus usage |
| OpenObserve | OSS + cloud | Logs, metrics, traces, RUM | Yes | Yes | $0.50/GB ingested plus $0.01/GB queried |
| Uptrace | OSS + cloud | Logs, metrics, traces | Yes | Yes | 50 GB free/mo, then from $0.075/GB |
| Apache SkyWalking | OSS (Apache-2.0) | Traces, metrics, logs, eBPF profiling | Yes | Partial (own agents; accepts OTel) | Free (self-host only) |
| New Relic | SaaS | Full platform | No | Yes (OTLP ingest) | 100 GB/mo free, then per GB plus per user |
| Better Stack | SaaS | Logs, metrics, traces, uptime, incidents, errors | No | Yes (OTLP ingest) | Per GB plus bundles |
| Sentry | SaaS (+ self-host) | Errors, tracing, replays, logs | Yes (FSL licence) | Partial (OTLP traces/logs in open beta; no metrics) | Per plan plus event quotas |
| Honeycomb | SaaS | Traces/events, metrics | No | Yes | Per event (20M/mo free; Pro from $150/mo) |

"OTel-native" here means the backend accepts OTLP as a first-class input, so the same instrumentation can point somewhere else later.

## Why teams look for Datadog alternatives

Three reasons come up repeatedly, and you can check each one against public sources.

**1. The pricing model scales with infrastructure, not just data.** Datadog bills most core products per host. On its pricing page (checked 2026-10-15), Infrastructure Pro is $15 per host per month and Enterprise $23 (annual billing). APM is $31 per host per month when bought with Infrastructure on annual billing ($36 standalone), with APM Pro at $35 and APM Enterprise at $40. Logs are billed twice: $0.10/GB to ingest, then per million events to index ($1.70 for 15-day retention, or $0.05 on Flex). Autoscaling, many small nodes or containers beyond your allotment ($0.002 per container-hour over the allotment) all push the bill up without anyone writing new code.

**2. Custom metrics are a separate meter.** Infrastructure Pro includes 100 custom metrics per host (200 on Enterprise). Every unique combination of metric name and tag values counts as a custom metric, so one `user_id` or `pod` tag can multiply the count. This is the same cardinality problem every metrics backend has. Datadog just turns it directly into a line item.

**3. Bill shock is real and public.** The best-documented case is Coinbase. The Pragmatic Engineer reported (May 2023, citing current and former engineers) that Coinbase's Datadog bill for 2021 was $65M. Coinbase then built an in-house stack on Grafana, Prometheus and ClickHouse, and stayed only after Datadog restructured the contract. Datadog's CEO described the contract restructuring on an earnings call (reported by The New Stack). That's an extreme case, but it shows how a usage-based observability bill can compound.

To be fair: lock-in is partly self-inflicted. If you instrument with Datadog's proprietary agents and libraries, leaving means re-instrumenting. If you instrument with OpenTelemetry, which Datadog itself supports, leaving mostly means changing an exporter.

## How we evaluated

- **Independence:** no vendor paid for placement or reviewed the copy, and we don't use affiliate links. Many pages ranking for this query are written by a vendor that ranks itself first. We list vendor savings claims only as vendor claims.
- **Audience:** small and mid-sized teams running Node.js, web or React Native backends, not 5,000-host enterprises.
- **Criteria:** signals covered, self-host option and licence, OpenTelemetry/OTLP support, pricing model and published prices, and operational effort.
- **Evidence:** vendor pricing pages and docs, project READMEs and licences, GitHub data (2026-10-15), and our own Collector and Prometheus runs. We didn't benchmark ingest or query performance.

## Open-source alternatives

### SigNoz

SigNoz is an OpenTelemetry-native, all-in-one backend for traces, metrics and logs, built on ClickHouse. It's the closest open-source match to Datadog's "one UI for everything" experience: service maps, APM views, trace explorer, log search, dashboards and alerts. It has about 32.4k GitHub stars (2026-10-15). GitHub shows the licence as NOASSERTION because the repo is mixed: the README says code outside the `ee/` directory is MIT and `ee/` has its own licence.

- **Self-host:** Docker or Kubernetes (Helm). You operate ClickHouse, the most demanding part.
- **SigNoz Cloud (2026-10-15):** Teams plan $49/month including $49 of usage. Logs and traces cost $0.30/GB (15-day retention), metrics $0.10 per million samples (1-month retention), with no per-host or per-user fees. Enterprise starts at $4,000/month, and there's a $19/month startup programme. SigNoz claims you can "save up to 80%" versus Datadog. That's a vendor claim we haven't tested.
- **Best for:** teams that want Datadog-style APM without per-host pricing.

### Grafana stack (Prometheus/Mimir, Loki, Tempo, Grafana)

The composable route uses Prometheus (66.6k stars, Apache-2.0) or Mimir for metrics, Loki (29.0k stars) for logs, Tempo for traces and Grafana (77.3k stars) for dashboards and alerting. Loki, Tempo, Mimir and Grafana are AGPL-3.0. Each part is best-in-class and very widely documented. The cost is integration and operations: four systems to run, upgrade and size, and three query languages (PromQL, LogQL, TraceQL).

- **Best for:** teams that already run Prometheus, or want to avoid an all-in-one vendor.
- **Node.js logging:** ship JSON logs from [Pino](/tools/pino/) or [Winston](/tools/winston/) to [Loki](/tools/grafana-loki/) via `pino-loki` (3.0.0) or `winston-loki` (6.1.7), or log to stdout and let an agent ship it.

### OpenObserve

OpenObserve (22.4k stars, AGPL-3.0) is a single Rust binary that stores logs, metrics, traces and RUM data as Parquet on object storage, and it's OpenTelemetry-native. You query logs and traces with SQL, and metrics with SQL or PromQL. The README's "140x lower storage cost" figure is a vendor comparison against Elasticsearch, not against Datadog, and we haven't verified it.

- **Cloud (2026-10-15):** $0.50/GB ingested plus $0.01/GB queried, with no per-host or seat fees. Metrics are retained 15 months and other data 30 days (extendable at $0.02/GB per extra 30 days). There's a 14-day trial. The self-hosted Enterprise edition is free up to 50 GB/day of ingestion.
- **Best for:** log-heavy workloads where cheap object storage matters, and teams that prefer SQL.

### Uptrace

Uptrace (4.3k stars, AGPL-3.0) is an OpenTelemetry-native APM on ClickHouse, with PostgreSQL for metadata. It covers traces, metrics and logs, with pre-built dashboards and alerting. It's a smaller project than SigNoz with a similar architecture.

- **Cloud (2026-10-15):** free up to 50 GB and 5,000 time series per month. After that it starts at $0.075/GB (the pricing page also says rates start at $0.10/GB and fall with volume), and metrics from $0.025 per million data points. Default retention is 28 days, with a hard budget cap option. The self-hosted Community Edition is free.
- **Best for:** small teams that want simple per-GB pricing with a cap.

### Apache SkyWalking

SkyWalking (25.0k stars, Apache-2.0) is a mature APM with its own agents, including Node.js. It also accepts OpenTelemetry, Zipkin and Prometheus data, and offers eBPF-based profiling through its Rover agent and its own BanyanDB storage. It's strongest for microservice topology and service-centric dashboards, and especially popular in Java-heavy shops. It's less OpenTelemetry-first than SigNoz or Uptrace.

**Also worth a look:** Coroot (8.0k stars, Apache-2.0) uses eBPF to collect metrics, logs, traces and profiles with no code changes, which is useful for services you can't instrument.

## SaaS alternatives

### Grafana Cloud

This is managed Prometheus/Mimir, Loki, Tempo and Grafana. The free tier (2026-10-15) includes 10k metric series, 50 GB logs, 50 GB traces and 14-day retention, plus 500 k6 virtual-user hours. Pro is $19/month plus usage, with metrics at $6.50 per 1,000 series beyond the included amount. It's the easiest way to get the Grafana stack without running it, and it accepts OTLP directly.

### New Relic

New Relic prices by data and users, not hosts. The free tier gives 100 GB/month of ingest and one full platform user. Beyond that, data is $0.40/GB ($0.60/GB on Data Plus). On Standard, the first full platform user is $10 and additional ones $99 each. Pro is $349 per full user per month (annual), and core users are $49. It's a full Datadog-class platform, so it suits teams that want feature parity, but the per-user price matters as the team grows.

### Better Stack

[Better Stack](/tools/betterstack/) combines logs, metrics, traces (via OTLP), uptime monitoring, status pages, incident management and error tracking. The free tier (2026-10-15) includes 10 monitors, 100k exceptions, 3 GB logs and 3 GB traces retained for 3 days, 30 GB metrics and 5,000 session replays. Log ingestion is $0.10/GB (EU) or $0.15/GB (US). Bundles start at $30/month (Nano, EU) and responder seats cost $29–34/month. Its error tracking is "Sentry SDK-compatible", and Better Stack's "1/6th the price" comparison is a vendor claim.

### Sentry

[Sentry](/tools/sentry/) is the default choice for error tracking, and it also covers tracing, session replay and logs. Plans (2026-10-15): Developer is free (1 user, 5k errors, 5M spans, 50 replays), Team is $26/month and Business $80/month (annual). Sentry can ingest OTLP traces and logs, but this is in **open beta** and doesn't support OTLP metrics, so it doesn't replace a metrics backend. You can self-host Sentry under the Functional Source License (FSL-1.1-Apache-2.0), but it's a heavy deployment.

### Honeycomb

Honeycomb is event-based tracing and observability with high-cardinality querying, and it's strongly OpenTelemetry-oriented. Free covers up to 20M events and 100M metric data points per month. Pro starts at $150/month for 50M events (up to 750M), with unlimited seats and queries. It's best for debugging distributed systems by arbitrary attributes, not for infrastructure dashboards.

## Replacing Datadog job by job

| Datadog product | Open-source option | SaaS option | Notes |
|---|---|---|---|
| APM and distributed tracing | SigNoz, Tempo, Uptrace, SkyWalking | Honeycomb, Grafana Cloud, New Relic | Instrument with the OpenTelemetry SDK; auto-instrumentation exists for Node.js |
| Log Management | Loki, OpenObserve, SigNoz | Better Stack, Grafana Cloud | Structure logs as JSON (Pino/Winston) and add trace IDs for correlation |
| Infrastructure and custom metrics | Prometheus/Mimir (+ Grafana), SigNoz | Grafana Cloud, New Relic | Cardinality still costs money everywhere; it's just priced differently |
| Error Tracking | Self-hosted Sentry (FSL) | Sentry, Better Stack | Datadog Error Tracking lists $25 for 50k errors (2026-10-15) |
| RUM / frontend | OpenObserve RUM | Sentry (replays, frontend errors), Grafana Cloud | Mobile RUM coverage differs a lot; check your platform SDK first |
| Uptime and synthetics | Prometheus Blackbox exporter | Better Stack (10 free monitors), Grafana Cloud | For load testing rather than uptime, see [k6](/tools/k6/) |

Splitting jobs across tools is often cheaper, but you lose some cross-signal navigation, such as jumping from a slow trace to the exact logs. OpenTelemetry trace IDs in your logs keep most of it, as long as both tools can link on `trace_id`.

## Pricing models compared

| Model | Who uses it | What grows the bill | Watch out for |
|---|---|---|---|
| Per host (plus allotments) | Datadog Infrastructure and APM | Number of hosts and containers, custom metrics, indexed events | Autoscaling, many small nodes, high-cardinality tags |
| Per GB ingested | SigNoz, OpenObserve, Uptrace, Better Stack, New Relic, Grafana Cloud (logs/traces) | Telemetry volume | Debug logging left on; verbose spans |
| Per event or span | Honeycomb, Sentry (quotas) | Request volume and sampling rate | Traffic spikes; use sampling |
| Per active series | Grafana Cloud metrics, Prometheus capacity | Label cardinality | `user_id`-style labels |
| Per user | New Relic full users, Better Stack responders | Team size | Who actually needs a full seat |

### Illustrative small-team example

This is a made-up but plausible setup, priced from public list prices on 2026-10-15. It's an illustration, not a quote. A startup runs **4 hosts** with APM on all of them, sends **30 GB of logs** a month (about 30M events at about 1 KB each, all indexed for 15 days), **20 GB of traces** (about 40M spans, using Uptrace's published estimate of about 500 bytes per span) and about **2,000 active metric series** at one sample per minute (about 86M samples a month).

| Option | Rough monthly cost | How we got there |
|---|---|---|
| Datadog (annual, list) | ~$238 | Infra Pro 4 × $15 + APM 4 × $31 + log ingest 30 × $0.10 + indexing 30M × $1.70/M. Excludes overages beyond per-host allotments, RUM and Error Tracking |
| SigNoz Cloud Teams | $49 | Usage ≈ $9 logs + $6 traces + $8.60 metrics = ~$24, inside the $49 minimum |
| Grafana Cloud | $0 if it fits the free tier | 2,000 series < 10k, 30 GB logs < 50 GB, 20 GB traces < 50 GB; 14-day retention. Pro from $19/mo + usage if not |
| Uptrace Cloud | ~$0 | 50 GB spans+logs and < 5,000 series fit the free allowance |
| New Relic | $0 for one full user | 50 GB plus metrics < 100 GB free; each additional full user on Standard is $99/mo |
| Honeycomb | from $150 | ~40M spans exceeds the 20M free events, so Pro applies |

The point isn't the exact numbers, which change. It's that the **shape** of your telemetry decides the winner. Many hosts with little data favour per-GB vendors. Few hosts with huge log volume can make per-host pricing look fine and per-GB pricing expensive. Run your own numbers with real volumes from a week of data.

## Migrating: instrument with OpenTelemetry first, then switch backends

The safest migration doesn't change two things at once:

1. **Instrument with OpenTelemetry** (the Node SDK plus auto-instrumentation) and send OTLP to an [OpenTelemetry](/tools/opentelemetry/) Collector, while **Datadog keeps receiving everything**. Datadog documents this path and accepts OTLP. Its current recommended Collector setup uses the `otlp_http` exporter, a `span_metrics` connector for APM views and `cumulativetodelta` for metrics.
2. **Dual-ship** to a candidate backend for a few weeks and compare dashboards, alerts and cost.
3. **Cut over** by removing the Datadog exporter. Your application code doesn't change.

A trimmed dual-ship Collector config (validated with `otelcol-contrib validate`, version 0.162.0; not run against a live Datadog account):

```yaml
# Dual-ship: keep Datadog running while a candidate backend receives the same data.
receivers:
  otlp:
    protocols:
      grpc: { endpoint: 0.0.0.0:4317 }
      http: { endpoint: 0.0.0.0:4318 }

processors:
  resource_detection:
    detectors: [env, system]
  cumulativetodelta: {}          # Datadog's recommended temporality; the candidate keeps cumulative

connectors:
  span_metrics:                  # RED metrics that power Datadog APM views (trimmed; see Datadog docs for full dimension list)
    aggregation_temporality: AGGREGATION_TEMPORALITY_DELTA
    histogram:
      exponential: {}
      unit: s

exporters:
  otlp_http/datadog:
    endpoint: https://otlp.${env:DD_SITE}          # e.g. otlp.datadoghq.eu
    headers:
      dd-api-key: ${env:DD_API_KEY}
  otlp_http/candidate:
    endpoint: ${env:CANDIDATE_OTLP_ENDPOINT}       # SigNoz, Grafana Cloud, OpenObserve, Uptrace, Honeycomb...
    headers:
      authorization: ${env:CANDIDATE_AUTH_HEADER}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource_detection]
      exporters: [span_metrics, otlp_http/datadog, otlp_http/candidate]
    metrics/datadog:
      receivers: [otlp, span_metrics]
      processors: [resource_detection, cumulativetodelta]
      exporters: [otlp_http/datadog]
    metrics/candidate:
      receivers: [otlp]
      processors: [resource_detection]
      exporters: [otlp_http/candidate]
    logs:
      receivers: [otlp]
      processors: [resource_detection]
      exporters: [otlp_http/datadog, otlp_http/candidate]
```

Datadog's own reference config adds a much longer `span_metrics` dimension list, host metrics, batching and compression. Copy the dimensions from its docs if you rely on Datadog APM pages during the dual-ship period. Header names and endpoints for the candidate come from that vendor's OTLP docs (for example, Sentry uses an `x-sentry-auth` header and project-specific endpoints, and Better Stack uses `Authorization: Bearer <source token>`).

The Node side is backend-agnostic:

```bash
npm i @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
export OTEL_SERVICE_NAME=users-api
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318   # the Collector, never a vendor directly
export OTEL_NODE_RESOURCE_DETECTORS=env,host,os            # skips cloud metadata probes off-cloud
node --require @opentelemetry/auto-instrumentations-node/register app.js
```

We ran this against a local Collector (0.162.0): spans from an Express 5 app arrived without code changes. Without the `OTEL_NODE_RESOURCE_DETECTORS` line, Node printed a harmless `MetadataLookupWarning` from the GCP detector on our non-cloud machine.

Things that don't move automatically: Datadog dashboards, monitors and SLOs (rebuild them, ideally as code), DogStatsD custom metrics (replace them with OTel metrics or a Collector `statsd` receiver), and Datadog-specific tags (map them to OTel resource attributes such as `service.name`, `deployment.environment.name` and `service.version`).

## When Datadog is still the right choice

- You use many Datadog products together (APM, logs, RUM, security, CI visibility, database monitoring), and the correlated UI saves more engineering time than the bill costs.
- You have a negotiated enterprise contract with committed-use discounts, so list prices don't apply to you.
- You have no capacity to run ClickHouse, Loki or Prometheus, and the SaaS alternatives don't cover a product you depend on.
- Compliance or procurement already approved Datadog and a second vendor would take months.

Even then, OpenTelemetry instrumentation keeps your options open. Datadog itself supports it.

## FAQ

### What is the best open-source alternative to Datadog?
For an all-in-one experience, SigNoz: it's OpenTelemetry-native, covers traces, metrics and logs in one UI, and stores data in ClickHouse. If you'd rather compose best-in-class parts, use the Grafana stack (Prometheus or Mimir, Loki, Tempo, Grafana). OpenObserve is a strong option for log-heavy workloads on object storage.

### Is there a free Datadog alternative?
Yes. Self-hosted SigNoz, the Grafana stack, OpenObserve, Uptrace, SkyWalking and Coroot are free to run (you pay for servers and time). Managed free tiers include Grafana Cloud (10k series, 50 GB logs, 50 GB traces), New Relic (100 GB/month, one full user), Uptrace Cloud (50 GB) and Sentry Developer (50k errors), all as of 2026-10-15. Datadog's own free tier covers up to 5 hosts with 1-day retention.

### What is cheaper than Datadog?
For small teams, usage-based vendors such as SigNoz Cloud, Grafana Cloud, Uptrace and New Relic's free tier are often cheaper because they don't charge per host. Whether that holds for you depends on your data volume. Price a real week of telemetry before switching. Vendor savings percentages are marketing claims.

### Can Grafana replace Datadog?
Grafana alone is dashboards. Grafana plus Prometheus or Mimir (metrics), Loki (logs) and Tempo (traces), self-hosted or on Grafana Cloud, covers most of Datadog's infrastructure, APM and log jobs. You'll rebuild dashboards and alerts, and you'll work with PromQL, LogQL and TraceQL rather than one query language.

### Is SigNoz a good Datadog alternative?
For teams that mainly use Datadog APM, logs and metrics, yes. It's the closest single-product match, it's OpenTelemetry-native, and SigNoz Cloud has no per-host or per-user fees. The trade-offs: self-hosting means operating ClickHouse, and it has fewer adjacent products (security, RUM depth, synthetics) than Datadog.

### How hard is it to migrate off Datadog?
The instrumentation is the hard part, and OpenTelemetry solves it once. Add the OTel SDK and a Collector while Datadog keeps receiving data, dual-ship to the new backend, then remove the Datadog exporter. Dashboards, monitors and DogStatsD metrics need rebuilding. Plan weeks, not days, for a production system.

## Related

- [Datadog tool page](/tools/datadog/)
- [OpenTelemetry](/tools/opentelemetry/)
- [Grafana Loki](/tools/grafana-loki/)
- [Sentry](/tools/sentry/) · [Better Stack](/tools/betterstack/)
- [Pino](/tools/pino/) · [Winston](/tools/winston/)
- [All observability tools](/observability/)

## Sources

All accessed 2026-10-15.

- Datadog pricing: https://www.datadoghq.com/pricing/ (Infrastructure, APM, Log Management, Error Tracking)
- Datadog, Set Up the OpenTelemetry Collector: https://docs.datadoghq.com/opentelemetry/setup/collector_exporter/
- SigNoz pricing: https://signoz.io/pricing/; SigNoz README and LICENSE: https://github.com/SigNoz/signoz
- Grafana Cloud pricing: https://grafana.com/pricing/
- OpenObserve pricing: https://openobserve.ai/pricing/; README: https://github.com/openobserve/openobserve
- Uptrace pricing: https://uptrace.dev/pricing; README: https://github.com/uptrace/uptrace
- Apache SkyWalking README: https://github.com/apache/skywalking
- Coroot README: https://github.com/coroot/coroot
- New Relic pricing: https://newrelic.com/pricing
- Better Stack pricing: https://betterstack.com/pricing; OpenTelemetry docs: https://betterstack.com/docs/logs/open-telemetry/
- Sentry pricing: https://sentry.io/pricing/; OTLP docs (open beta): https://docs.sentry.io/concepts/otlp/; licence: https://github.com/getsentry/sentry/blob/master/LICENSE.md
- Honeycomb pricing: https://www.honeycomb.io/pricing
- The Pragmatic Engineer, "Datadog's $65M/year customer mystery solved" (May 2023): https://blog.pragmaticengineer.com/datadog-65m-year-customer-mystery/
- The New Stack, "Datadog's $65M Bill and Why Developers Should Care" (May 2023): https://thenewstack.io/datadogs-65m-bill-and-why-developers-should-care/
- GitHub API (stars and licences, 2026-10-15): prometheus/prometheus, grafana/grafana, grafana/loki, grafana/tempo, grafana/mimir, SigNoz/signoz, openobserve/openobserve, uptrace/uptrace, apache/skywalking, coroot/coroot
- npm registry: pino-loki 3.0.0, winston-loki 6.1.7
