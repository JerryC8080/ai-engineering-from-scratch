/**
 * LLM Observability Dashboard: ingest + UI skeleton (TypeScript).
 *
 * Implements the ingest plane from docs/en.md: a stdlib HTTP server that
 * accepts OpenTelemetry GenAI-shaped spans on /trace, holds them in a 10k
 * ring buffer, and renders /dashboard (HTML + JSON) with rolled-up p50/p95/p99
 * latency and cost per model. Stands in for a real Langfuse/Phoenix backend
 * for the capstone, with the same span schema so a real OTLP exporter could
 * be pointed at it.
 *
 * Source: phases/19-capstone-projects/11-llm-observability-dashboard/docs/en.md
 * Schema: OpenTelemetry GenAI Semantic Conventions
 *   https://opentelemetry.io/docs/specs/semconv/gen-ai/
 *
 * Runs on Node 20+ stdlib. No npm deps. No real API calls.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

type GenAISpan = {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  name: string;
  start_time_unix_nano: number;
  end_time_unix_nano: number;
  status: "OK" | "ERROR";
  attributes: {
    "gen_ai.system": string;
    "gen_ai.request.model": string;
    "gen_ai.operation.name": "chat" | "text_completion" | "embeddings";
    "gen_ai.usage.input_tokens"?: number;
    "gen_ai.usage.output_tokens"?: number;
    "gen_ai.usage.cached_input_tokens"?: number;
    "gen_ai.response.model"?: string;
    "gen_ai.response.finish_reasons"?: string[];
    [key: string]: unknown;
  };
};

const PRICE_USD_PER_MTOKEN: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-5.4": { input: 5, output: 15 },
  "claude-3-5-sonnet": { input: 3, output: 15 },
  "claude-opus-4-7": { input: 15, output: 75 },
  "gemini-2-5-pro": { input: 1.25, output: 5 },
};

function spanCostUsd(span: GenAISpan): number {
  const model = span.attributes["gen_ai.response.model"] ??
    span.attributes["gen_ai.request.model"];
  const price = PRICE_USD_PER_MTOKEN[model];
  if (!price) return 0;
  const inTok = Number(span.attributes["gen_ai.usage.input_tokens"] ?? 0);
  const outTok = Number(span.attributes["gen_ai.usage.output_tokens"] ?? 0);
  return (inTok / 1e6) * price.input + (outTok / 1e6) * price.output;
}

function spanLatencyMs(span: GenAISpan): number {
  return (span.end_time_unix_nano - span.start_time_unix_nano) / 1e6;
}

class RingBuffer<T> {
  private readonly capacity: number;
  private readonly slots: (T | undefined)[];
  private writeIdx = 0;
  private filled = false;

  constructor(capacity: number) {
    if (capacity <= 0) throw new Error("capacity must be > 0");
    this.capacity = capacity;
    this.slots = new Array<T | undefined>(capacity);
  }

  push(item: T): void {
    this.slots[this.writeIdx] = item;
    this.writeIdx = (this.writeIdx + 1) % this.capacity;
    if (this.writeIdx === 0) this.filled = true;
  }

  size(): number {
    return this.filled ? this.capacity : this.writeIdx;
  }

  snapshot(): T[] {
    if (!this.filled) return this.slots.slice(0, this.writeIdx) as T[];
    return [
      ...(this.slots.slice(this.writeIdx) as T[]),
      ...(this.slots.slice(0, this.writeIdx) as T[]),
    ];
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const rank = (sorted.length - 1) * p;
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo]!;
  const frac = rank - lo;
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
}

type ModelRollup = {
  model: string;
  count: number;
  errors: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
};

function rollUpByModel(spans: GenAISpan[]): ModelRollup[] {
  const groups = new Map<string, GenAISpan[]>();
  for (const s of spans) {
    const model = s.attributes["gen_ai.response.model"] ??
      s.attributes["gen_ai.request.model"];
    if (!groups.has(model)) groups.set(model, []);
    groups.get(model)!.push(s);
  }
  const rollups: ModelRollup[] = [];
  for (const [model, list] of groups) {
    const latencies = list.map(spanLatencyMs).sort((a, b) => a - b);
    let inputTokens = 0;
    let outputTokens = 0;
    let costUsd = 0;
    let errors = 0;
    for (const s of list) {
      inputTokens += Number(s.attributes["gen_ai.usage.input_tokens"] ?? 0);
      outputTokens += Number(s.attributes["gen_ai.usage.output_tokens"] ?? 0);
      costUsd += spanCostUsd(s);
      if (s.status === "ERROR") errors += 1;
    }
    rollups.push({
      model,
      count: list.length,
      errors,
      inputTokens,
      outputTokens,
      costUsd: Number(costUsd.toFixed(4)),
      p50LatencyMs: Number(percentile(latencies, 0.5).toFixed(2)),
      p95LatencyMs: Number(percentile(latencies, 0.95).toFixed(2)),
      p99LatencyMs: Number(percentile(latencies, 0.99).toFixed(2)),
    });
  }
  rollups.sort((a, b) => b.count - a.count);
  return rollups;
}

class ObservabilityStore {
  private readonly spans = new RingBuffer<GenAISpan>(10_000);
  private accepted = 0;
  private rejected = 0;

  ingest(raw: unknown): { accepted: number; rejected: number } {
    const items = Array.isArray(raw) ? raw : [raw];
    for (const item of items) {
      const span = normaliseSpan(item);
      if (!span) {
        this.rejected += 1;
        continue;
      }
      this.spans.push(span);
      this.accepted += 1;
    }
    return { accepted: this.accepted, rejected: this.rejected };
  }

  snapshot(): GenAISpan[] {
    return this.spans.snapshot();
  }

  counters(): { accepted: number; rejected: number; held: number } {
    return {
      accepted: this.accepted,
      rejected: this.rejected,
      held: this.spans.size(),
    };
  }
}

function normaliseSpan(raw: unknown): GenAISpan | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const attrs = (r["attributes"] ?? {}) as Record<string, unknown>;
  if (typeof attrs["gen_ai.system"] !== "string") return null;
  if (typeof attrs["gen_ai.request.model"] !== "string") return null;
  const start = Number(r["start_time_unix_nano"] ?? 0);
  const end = Number(r["end_time_unix_nano"] ?? start);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return {
    trace_id: typeof r["trace_id"] === "string" ? r["trace_id"] : randomUUID(),
    span_id: typeof r["span_id"] === "string" ? r["span_id"] : randomUUID().slice(0, 16),
    parent_span_id:
      typeof r["parent_span_id"] === "string" ? r["parent_span_id"] : undefined,
    name: typeof r["name"] === "string" ? r["name"] : "chat.completion",
    start_time_unix_nano: start,
    end_time_unix_nano: end,
    status: r["status"] === "ERROR" ? "ERROR" : "OK",
    attributes: attrs as GenAISpan["attributes"],
  };
}

function readBody(req: IncomingMessage, maxBytes = 5_000_000): Promise<string> {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function renderDashboardHtml(store: ObservabilityStore): string {
  const rollups = rollUpByModel(store.snapshot());
  const counters = store.counters();
  const rows = rollups
    .map(
      (r) =>
        `<tr><td>${r.model}</td><td>${r.count}</td><td>${r.errors}</td>` +
        `<td>${r.inputTokens}</td><td>${r.outputTokens}</td>` +
        `<td>$${r.costUsd.toFixed(4)}</td>` +
        `<td>${r.p50LatencyMs}</td><td>${r.p95LatencyMs}</td><td>${r.p99LatencyMs}</td></tr>`,
    )
    .join("\n");
  return [
    "<!doctype html>",
    "<html><head><title>LLM observability dashboard</title>",
    "<style>",
    "body{font-family:system-ui,sans-serif;margin:2rem;max-width:1100px;}",
    "table{border-collapse:collapse;width:100%;}",
    "th,td{padding:.4rem .8rem;border-bottom:1px solid #ddd;text-align:left;font-variant-numeric:tabular-nums;}",
    "th{background:#f3f3f3;}",
    ".stats{display:flex;gap:1.5rem;margin-bottom:1rem;}",
    ".stat{background:#fafafa;border:1px solid #ddd;padding:.6rem 1rem;border-radius:6px;}",
    "</style></head><body>",
    "<h1>LLM observability dashboard</h1>",
    "<div class='stats'>",
    `<div class='stat'><b>${counters.accepted}</b> spans accepted</div>`,
    `<div class='stat'>${counters.held} in 10k ring buffer</div>`,
    `<div class='stat'>${counters.rejected} rejected</div>`,
    "</div>",
    "<table><thead><tr>",
    "<th>model</th><th>spans</th><th>errors</th><th>input tok</th><th>output tok</th>",
    "<th>cost</th><th>p50 ms</th><th>p95 ms</th><th>p99 ms</th>",
    "</tr></thead><tbody>",
    rows,
    "</tbody></table>",
    "<p><small>POST OTel-GenAI spans to /trace. JSON roll-up at /dashboard.json.</small></p>",
    "</body></html>",
  ].join("\n");
}

function makeHandler(store: ObservabilityStore) {
  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;
    try {
      if (req.method === "POST" && path === "/trace") {
        const body = await readBody(req);
        const parsed = JSON.parse(body) as unknown;
        const counters = store.ingest(parsed);
        writeJson(res, 202, { status: "accepted", counters });
        return;
      }
      if (req.method === "GET" && (path === "/" || path === "/dashboard")) {
        const html = renderDashboardHtml(store);
        res.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "content-length": Buffer.byteLength(html),
        });
        res.end(html);
        return;
      }
      if (req.method === "GET" && path === "/dashboard.json") {
        writeJson(res, 200, {
          counters: store.counters(),
          models: rollUpByModel(store.snapshot()),
        });
        return;
      }
      if (req.method === "GET" && path === "/healthz") {
        writeJson(res, 200, { status: "ok", counters: store.counters() });
        return;
      }
      writeJson(res, 404, { error: "not_found", path });
    } catch (err) {
      writeJson(res, 400, { error: "bad_request", message: String(err) });
    }
  };
}

type SyntheticConfig = {
  spans: number;
  errorRate: number;
  models: string[];
};

function generateSyntheticSpans(cfg: SyntheticConfig): GenAISpan[] {
  const now = Date.now() * 1e6;
  const out: GenAISpan[] = [];
  for (let i = 0; i < cfg.spans; i++) {
    const model = cfg.models[i % cfg.models.length]!;
    const baseLatencyMs = 400 + ((i * 31) % 1800);
    const inputTokens = 200 + ((i * 17) % 4000);
    const outputTokens = 120 + ((i * 23) % 800);
    const isError = (i % Math.max(1, Math.round(1 / cfg.errorRate))) === 0 &&
      i > 0;
    out.push({
      trace_id: `trace-${i.toString(16).padStart(8, "0")}`,
      span_id: `span-${i.toString(16).padStart(8, "0")}`,
      name: "chat.completion",
      start_time_unix_nano: now + i * 1_000_000,
      end_time_unix_nano: now + i * 1_000_000 + baseLatencyMs * 1e6,
      status: isError ? "ERROR" : "OK",
      attributes: {
        "gen_ai.system": model.startsWith("gpt")
          ? "openai"
          : model.startsWith("claude")
            ? "anthropic"
            : "google",
        "gen_ai.request.model": model,
        "gen_ai.response.model": model,
        "gen_ai.operation.name": "chat",
        "gen_ai.usage.input_tokens": inputTokens,
        "gen_ai.usage.output_tokens": isError ? 0 : outputTokens,
        "gen_ai.response.finish_reasons": [isError ? "error" : "stop"],
      },
    });
  }
  return out;
}

function reportRollups(rollups: ModelRollup[]): void {
  console.log("[obs] model roll-ups:");
  console.log(
    "  " +
      ["model", "n", "err", "p50", "p95", "p99", "cost($)"]
        .map((s) => s.padEnd(20))
        .join(""),
  );
  for (const r of rollups) {
    console.log(
      "  " +
        [
          r.model,
          String(r.count),
          String(r.errors),
          r.p50LatencyMs.toFixed(1),
          r.p95LatencyMs.toFixed(1),
          r.p99LatencyMs.toFixed(1),
          r.costUsd.toFixed(4),
        ]
          .map((s) => s.padEnd(20))
          .join(""),
    );
  }
}

function main(): void {
  console.log("[obs] generating 1200 synthetic OTel-GenAI spans...");
  const store = new ObservabilityStore();
  const synthetic = generateSyntheticSpans({
    spans: 1200,
    errorRate: 0.03,
    models: [
      "gpt-4o-mini",
      "gpt-5.4",
      "claude-3-5-sonnet",
      "claude-opus-4-7",
      "gemini-2-5-pro",
    ],
  });
  store.ingest(synthetic);
  reportRollups(rollUpByModel(store.snapshot()));
  console.log("[obs] counters:", store.counters());
  if (process.env["SERVE"] === "1") {
    const port = Number(process.env["PORT"] ?? 8011);
    const server = createServer(makeHandler(store));
    server.listen(port, () => {
      console.log(`[obs] ingest + dashboard on http://localhost:${port}`);
    });
  } else {
    console.log(
      "[obs] set SERVE=1 to start the HTTP server on PORT (default 8011)",
    );
  }
}

main();
