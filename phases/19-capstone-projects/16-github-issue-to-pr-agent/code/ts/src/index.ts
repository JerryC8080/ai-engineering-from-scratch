// GitHub Issue-to-PR Agent: TypeScript webhook receiver.
// Python side ships the agent loop; YAML side ships the Actions workflow.
// This project verifies HMAC, routes on event type, dispatches a stub agent.
// Refs: docs/en.md (this lesson),
//   GitHub webhook signature: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
//   GitHub App docs: https://docs.github.com/en/apps

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { AuditLog } from "./agent.js";
import { route } from "./router.js";
import { buildApp } from "./server.js";
import { expectedSig, verifySignature } from "./verify.js";

const SHARED_SECRET = process.env.GH_WEBHOOK_SECRET ?? "demo-shared-secret";

function demoDelivery(
  audit: AuditLog,
  event: string,
  payload: unknown,
  signingSecret: string,
): void {
  const raw = Buffer.from(JSON.stringify(payload), "utf8");
  const sig = expectedSig(raw, signingSecret);
  const ok = verifySignature(raw, sig, SHARED_SECRET);
  process.stdout.write(`\n>>> delivery event=${event} sig_valid=${ok}\n`);
  if (!ok) {
    process.stdout.write("<<< 401 invalid signature\n");
    return;
  }
  const result = route(audit, event, payload);
  process.stdout.write(`<<< ${result.code} ${JSON.stringify(result.body)}\n`);
}

function runDemo(): void {
  const audit = new AuditLog();

  process.stdout.write("=".repeat(72) + "\n");
  process.stdout.write("PHASE 19 LESSON 16 - GitHub webhook receiver (TypeScript)\n");
  process.stdout.write("=".repeat(72) + "\n");

  demoDelivery(audit, "ping", { zen: "Speak like a human.", hook_id: 12345 }, SHARED_SECRET);

  demoDelivery(
    audit,
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

  demoDelivery(
    audit,
    "issues",
    {
      action: "opened",
      issue: { number: 99, title: "evil" },
      repository: { full_name: "acme/widgets" },
    },
    "wrong-secret",
  );

  demoDelivery(
    audit,
    "issues",
    {
      action: "closed",
      issue: { number: 41, title: "skip me" },
      repository: { full_name: "acme/widgets" },
    },
    SHARED_SECRET,
  );

  process.stdout.write(`\naudit entries recorded: ${audit.count()}\n`);
}

function nodeAdapter(app: ReturnType<typeof buildApp>) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const host = req.headers.host ?? "localhost";
    const url = new URL(req.url ?? "/", `http://${host}`);
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
    const init: RequestInit = {
      method: req.method,
      headers: req.headers as Record<string, string>,
    };
    if (body) init.body = body;
    const fetchRes = await app.fetch(new Request(url.toString(), init));
    res.writeHead(fetchRes.status, Object.fromEntries(fetchRes.headers));
    res.end(Buffer.from(await fetchRes.arrayBuffer()));
  };
}

function runServer(port: number): void {
  const audit = new AuditLog();
  const app = buildApp(audit, SHARED_SECRET);
  const handler = nodeAdapter(app);
  const server = createServer((req, res) => {
    handler(req, res).catch((err) => {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(err) }));
    });
  });
  server.listen(port, () => {
    process.stdout.write(`webhook receiver on http://localhost:${port}/webhook\n`);
  });
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--serve")) {
    const portFlag = argv.indexOf("--port");
    const port = portFlag >= 0 ? Number(argv[portFlag + 1]) : 8081;
    runServer(port);
    return;
  }
  runDemo();
}

main();
