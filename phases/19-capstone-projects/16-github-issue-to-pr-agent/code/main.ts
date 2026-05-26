// GitHub Issue-to-PR Agent: GitHub App webhook receiver (TypeScript skeleton).
//
// The Python side (code/main.py) ships the agent loop and dispatcher; the YAML
// piece is the Actions workflow. This file is the "TypeScript (GitHub App)"
// half of the stack: a stdlib HTTP server that accepts webhook POSTs, verifies
// the HMAC signature, routes on event type, and emits a stub PR-creation log
// when an issue triggers the agent.
//
// Source refs:
//   docs/en.md (this lesson)
//   GitHub webhook signature: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
//   GitHub App docs:          https://docs.github.com/en/apps
//   AWS Remote SWE Agents:    https://github.com/aws-samples/remote-swe-agents
//
// Self-terminating demo (default): npx tsx main.ts
// Live HTTP receiver:              npx tsx main.ts --serve --port 8081

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";

const SHARED_SECRET = process.env.GH_WEBHOOK_SECRET ?? "demo-shared-secret";

// --- HMAC verification ----------------------------------------------------
//
// GitHub sends `X-Hub-Signature-256: sha256=<hex>` over the raw body. We MUST
// verify before parsing JSON. Source IP alone is not trustworthy.

function expectedSig(body: Buffer | string, secret: string): string {
  const mac = createHmac("sha256", secret);
  mac.update(body);
  return "sha256=" + mac.digest("hex");
}

function verifySignature(rawBody: Buffer, header: string | undefined, secret: string): boolean {
  if (!header) return false;
  const expected = expectedSig(rawBody, secret);
  const a = Buffer.from(header, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// --- Stub agent + audit log ----------------------------------------------

type AuditEntry = {
  ts: number;
  event: string;
  action: string;
  repo: string;
  issue?: number;
  note: string;
};

const AUDIT: AuditEntry[] = [];

function log(entry: AuditEntry): void {
  AUDIT.push(entry);
  process.stdout.write(JSON.stringify(entry) + "\n");
}

type WebhookHeaders = {
  event?: string;
  delivery?: string;
  signature?: string;
};

type IssuePayload = {
  action: string;
  issue?: { number: number; title: string; user?: { login: string } };
  repository?: { full_name: string };
};

type PingPayload = { zen?: string; hook_id?: number };

type RouteResult = { code: number; body: unknown };

// Mock the agent: a real impl would spawn a sandbox, run the agent loop,
// and open a PR via the GitHub REST API. The skeleton stops at the boundary.

function dispatchAgent(repo: string, issueNumber: number, title: string): string {
  const draftBranch = `agent/issue-${issueNumber}`;
  log({
    ts: Date.now(),
    event: "issues.opened",
    action: "dispatched_agent",
    repo,
    issue: issueNumber,
    note: `would clone ${repo}, spin sandbox, branch=${draftBranch}, title="${title}"`,
  });
  log({
    ts: Date.now(),
    event: "issues.opened",
    action: "stub_pr_created",
    repo,
    issue: issueNumber,
    note: `would open PR ${repo}#PR draft from ${draftBranch} -> main`,
  });
  return draftBranch;
}

function route(event: string, payload: unknown): RouteResult {
  if (event === "ping") {
    const p = payload as PingPayload;
    return { code: 200, body: { pong: p.zen ?? "no zen", hook_id: p.hook_id ?? null } };
  }
  if (event === "issues") {
    const p = payload as IssuePayload;
    if (p.action !== "opened") {
      return { code: 200, body: { skipped: true, reason: `issues.${p.action}` } };
    }
    const repo = p.repository?.full_name ?? "unknown/unknown";
    const issue = p.issue;
    if (!issue) return { code: 422, body: { error: "missing issue object" } };
    const branch = dispatchAgent(repo, issue.number, issue.title);
    return { code: 202, body: { dispatched: true, branch } };
  }
  if (event === "pull_request") {
    // we observe PR events for closing the loop, but the skeleton only logs.
    log({
      ts: Date.now(),
      event: "pull_request",
      action: "observed",
      repo: "n/a",
      note: "PR lifecycle event observed",
    });
    return { code: 200, body: { observed: true } };
  }
  return { code: 200, body: { ignored: true, event } };
}

// --- HTTP layer -----------------------------------------------------------

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, code: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload).toString(),
  });
  res.end(payload);
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "POST" || req.url !== "/webhook") {
    sendJson(res, 404, { error: "POST /webhook only", method: req.method, url: req.url });
    return;
  }
  const headers: WebhookHeaders = {
    event: req.headers["x-github-event"] as string | undefined,
    delivery: req.headers["x-github-delivery"] as string | undefined,
    signature: req.headers["x-hub-signature-256"] as string | undefined,
  };
  const body = await readBody(req);
  if (!verifySignature(body, headers.signature, SHARED_SECRET)) {
    sendJson(res, 401, { error: "invalid signature" });
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body.toString("utf8"));
  } catch (err) {
    sendJson(res, 400, { error: "invalid JSON", detail: String(err) });
    return;
  }
  const result = route(headers.event ?? "unknown", parsed);
  sendJson(res, result.code, result.body);
}

function serve(port: number): void {
  const server = createServer((req, res) => {
    handle(req, res).catch((err) => sendJson(res, 500, { error: String(err) }));
  });
  server.listen(port, () => {
    process.stdout.write(`webhook receiver on http://localhost:${port}/webhook\n`);
  });
}

// --- self-terminating demo -----------------------------------------------
//
// In-process replay of three webhook deliveries: a valid issues.opened, a
// bad-signature attempt, and a ping. No HTTP socket is opened so the
// process exits naturally.

function demoDelivery(event: string, payload: unknown, secret: string): void {
  const raw = Buffer.from(JSON.stringify(payload), "utf8");
  const sig = expectedSig(raw, secret);
  const ok = verifySignature(raw, sig, SHARED_SECRET);
  process.stdout.write(`\n>>> delivery event=${event} sig_valid=${ok}\n`);
  if (!ok) {
    process.stdout.write("<<< 401 invalid signature\n");
    return;
  }
  const result = route(event, payload);
  process.stdout.write(`<<< ${result.code} ${JSON.stringify(result.body)}\n`);
}

function demo(): void {
  process.stdout.write("=".repeat(72) + "\n");
  process.stdout.write("PHASE 19 LESSON 16 - GitHub App webhook receiver (TypeScript)\n");
  process.stdout.write("=".repeat(72) + "\n");

  demoDelivery("ping", { zen: "Speak like a human.", hook_id: 12345 }, SHARED_SECRET);

  demoDelivery(
    "issues",
    {
      action: "opened",
      issue: {
        number: 42,
        title: "Add /healthz endpoint",
        user: { login: "octocat" },
      },
      repository: { full_name: "acme/widgets" },
    },
    SHARED_SECRET,
  );

  // simulate an attacker with the wrong secret
  demoDelivery(
    "issues",
    { action: "opened", issue: { number: 99, title: "evil" }, repository: { full_name: "acme/widgets" } },
    "wrong-secret",
  );

  demoDelivery(
    "issues",
    { action: "closed", issue: { number: 41, title: "skip me" }, repository: { full_name: "acme/widgets" } },
    SHARED_SECRET,
  );

  process.stdout.write(`\naudit entries recorded: ${AUDIT.length}\n`);
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--serve")) {
    const portFlag = argv.indexOf("--port");
    const port = portFlag >= 0 ? Number(argv[portFlag + 1]) : 8081;
    serve(port);
    return;
  }
  demo();
}

main();
