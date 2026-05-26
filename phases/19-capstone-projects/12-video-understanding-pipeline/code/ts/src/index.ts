// Video understanding pipeline: TypeScript UI half of the lesson stack.
// Python side ships the multi-vector index + temporal grounding; this TS
// project exposes /jobs and /job/:id over the four pipeline stages.
// Refs: docs/en.md (this lesson),
//   VideoDB CRUD-for-video API: https://videodb.io
//   TransNetV2 scene segmentation: https://github.com/soCzech/TransNetV2

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "./server.js";
import { JobStore, seedFixture } from "./jobs.js";

function runDemo(): void {
  const store = new JobStore();
  seedFixture(store);

  process.stdout.write("=".repeat(72) + "\n");
  process.stdout.write("PHASE 19 LESSON 12 - video pipeline UI (TypeScript)\n");
  process.stdout.write("=".repeat(72) + "\n");

  process.stdout.write("\nGET /jobs\n");
  process.stdout.write(JSON.stringify({ jobs: store.summaries() }, null, 2) + "\n");

  for (const id of ["job-001", "job-002", "job-003", "job-404"]) {
    process.stdout.write(`\nGET /job/${id}\n`);
    const body = store.detail(id);
    if (!body) {
      process.stdout.write(JSON.stringify({ error: "not found", id }) + "\n");
      continue;
    }
    process.stdout.write(JSON.stringify(body, null, 2) + "\n");
  }
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
  const store = new JobStore();
  seedFixture(store);
  const app = buildApp(store);
  const handler = nodeAdapter(app);
  const server = createServer((req, res) => {
    handler(req, res).catch((err) => {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(err) }));
    });
  });
  server.listen(port, () => {
    process.stdout.write(`listening on http://localhost:${port}\n`);
  });
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--serve")) {
    const portFlag = argv.indexOf("--port");
    const port = portFlag >= 0 ? Number(argv[portFlag + 1]) : 8123;
    runServer(port);
    return;
  }
  runDemo();
}

main();
