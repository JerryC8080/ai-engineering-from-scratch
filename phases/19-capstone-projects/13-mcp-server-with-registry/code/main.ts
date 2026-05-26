// Internal MCP server: TypeScript skeleton, stdlib only.
//
// The Python side (code/main.py) ships the registry + OPA-style policy gate.
// This file is the "TypeScript (@modelcontextprotocol/sdk)" half mentioned in
// the lesson stack, hand-rolled with zero npm deps: newline-delimited
// JSON-RPC 2.0 over stdio, initialize / tools/list / tools/call / shutdown.
//
// Spec refs:
//   docs/en.md (this lesson), MCP 2025-11-25 spec:
//     https://modelcontextprotocol.io/specification/2025-11-25
//   JSON-RPC 2.0: https://www.jsonrpc.org/specification
//   MCP registry 2026: https://github.com/modelcontextprotocol/registry
//
// Self-terminating demo (default):  npx tsx main.ts
// Stdio MCP server loop:            npx tsx main.ts --serve

import { createInterface } from "node:readline";

const PROTOCOL_VERSION = "2025-11-25";
const SERVER_INFO = { name: "lesson-13-internal-mcp", version: "1.0.0" };

// --- Tool registry --------------------------------------------------------
//
// Three mock functions modeled on the capstone scenario (internal data api):
//   incidents_list  read-only listing of recent incidents
//   incidents_get   fetch a single incident by id (read-only)
//   incidents_ack   write: acknowledge an incident (scope-gated in prod)

type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: string[];
};

type ToolDescriptor = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean };
};

type Incident = { id: string; severity: "p0" | "p1" | "p2"; title: string; acked: boolean };

const INCIDENTS: Record<string, Incident> = {
  "INC-101": { id: "INC-101", severity: "p0", title: "checkout 500s", acked: false },
  "INC-102": { id: "INC-102", severity: "p2", title: "slow dashboard", acked: true },
  "INC-103": { id: "INC-103", severity: "p1", title: "rate-limit storm", acked: false },
};

const TOOLS: ToolDescriptor[] = [
  {
    name: "incidents_list",
    description: "Use when listing recent incidents or filtering by severity. Do not use to look up a single id.",
    inputSchema: {
      type: "object",
      properties: { severity: { type: "string", enum: ["p0", "p1", "p2"] } },
      required: [],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "incidents_get",
    description: "Use to fetch one incident by id. Do not use for listing.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "incidents_ack",
    description: "Use to acknowledge an incident. Write op; only authorized callers.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    annotations: { destructiveHint: false, readOnlyHint: false },
  },
];

type ContentBlock = { type: "text"; text: string };
type ToolArgs = Record<string, unknown>;

function execList(args: ToolArgs): ContentBlock[] {
  const sev = args.severity as string | undefined;
  const items = Object.values(INCIDENTS).filter((i) => !sev || i.severity === sev);
  return [{ type: "text", text: JSON.stringify(items) }];
}

function execGet(args: ToolArgs): ContentBlock[] {
  const id = String(args.id ?? "");
  const inc = INCIDENTS[id];
  if (!inc) throw new Error(`not found: ${id}`);
  return [{ type: "text", text: JSON.stringify(inc) }];
}

function execAck(args: ToolArgs): ContentBlock[] {
  const id = String(args.id ?? "");
  const inc = INCIDENTS[id];
  if (!inc) throw new Error(`not found: ${id}`);
  inc.acked = true;
  return [{ type: "text", text: JSON.stringify({ id, acked: true }) }];
}

const EXECUTORS: Record<string, (a: ToolArgs) => ContentBlock[]> = {
  incidents_list: execList,
  incidents_get: execGet,
  incidents_ack: execAck,
};

// --- JSON-RPC dispatcher --------------------------------------------------

type JsonRpcId = number | string | null;

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

let SHUTDOWN_REQUESTED = false;

function handleInitialize(): unknown {
  return {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: { tools: { listChanged: false } },
    serverInfo: SERVER_INFO,
  };
}

function handleToolsList(): unknown {
  return { tools: TOOLS };
}

function handleToolsCall(params: Record<string, unknown>): unknown {
  const name = String(params.name ?? "");
  const args = (params.arguments as ToolArgs | undefined) ?? {};
  const fn = EXECUTORS[name];
  if (!fn) {
    return { content: [{ type: "text", text: `unknown tool: ${name}` }], isError: true };
  }
  try {
    return { content: fn(args), isError: false };
  } catch (err) {
    return { content: [{ type: "text", text: String(err) }], isError: true };
  }
}

function handleShutdown(): unknown {
  SHUTDOWN_REQUESTED = true;
  return {};
}

const HANDLERS: Record<string, (params: Record<string, unknown>) => unknown> = {
  initialize: handleInitialize,
  "tools/list": handleToolsList,
  "tools/call": handleToolsCall,
  shutdown: handleShutdown,
};

function dispatch(msg: JsonRpcRequest): JsonRpcResponse | null {
  if (msg.id === undefined) {
    // a notification (no id, no response)
    return null;
  }
  const id = msg.id;
  const handler = HANDLERS[msg.method];
  if (!handler) {
    return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${msg.method}` } };
  }
  try {
    return { jsonrpc: "2.0", id, result: handler(msg.params ?? {}) };
  } catch (err) {
    return { jsonrpc: "2.0", id, error: { code: -32603, message: String(err) } };
  }
}

function parseRpc(line: string): { ok: true; msg: JsonRpcRequest } | { ok: false; err: string } {
  try {
    const m = JSON.parse(line) as JsonRpcRequest;
    if (m.jsonrpc !== "2.0" || typeof m.method !== "string") {
      return { ok: false, err: "invalid JSON-RPC envelope" };
    }
    return { ok: true, msg: m };
  } catch (err) {
    return { ok: false, err: String(err) };
  }
}

// --- stdio loop (server mode) --------------------------------------------

function serveStdio(): void {
  const rl = createInterface({ input: process.stdin, terminal: false });
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const parsed = parseRpc(trimmed);
    if (!parsed.ok) {
      const err: JsonRpcResponse = {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error", data: parsed.err },
      };
      process.stdout.write(JSON.stringify(err) + "\n");
      return;
    }
    const resp = dispatch(parsed.msg);
    if (resp) process.stdout.write(JSON.stringify(resp) + "\n");
    if (SHUTDOWN_REQUESTED) rl.close();
  });
  rl.on("close", () => process.exit(0));
}

// --- self-terminating demo: fixture sequence then exit -------------------
//
// Replays a canned JSON-RPC newline stream the way a real client (Claude
// Desktop, mcp-cli, etc) would drive the server, captures replies, then
// exits 0. No live stdin loop, no infinite read.

function demoFixture(): JsonRpcRequest[] {
  return [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: PROTOCOL_VERSION } },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "incidents_list", arguments: { severity: "p0" } } },
    { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "incidents_get", arguments: { id: "INC-101" } } },
    { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "incidents_ack", arguments: { id: "INC-101" } } },
    { jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "incidents_get", arguments: { id: "INC-101" } } },
    { jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "no_such_tool", arguments: {} } },
    { jsonrpc: "2.0", id: 8, method: "shutdown" },
    // notification (no id, no response)
    { jsonrpc: "2.0", method: "notifications/initialized" },
  ];
}

function demo(): void {
  process.stdout.write("=".repeat(72) + "\n");
  process.stdout.write("PHASE 19 LESSON 13 - internal MCP server (TypeScript, stdlib only)\n");
  process.stdout.write("=".repeat(72) + "\n");

  for (const msg of demoFixture()) {
    process.stdout.write("\n>>> " + JSON.stringify(msg) + "\n");
    const reply = dispatch(msg);
    if (reply) process.stdout.write("<<< " + JSON.stringify(reply) + "\n");
    else process.stdout.write("<<< (notification, no response)\n");
  }

  // belt-and-braces: a malformed line should produce a -32700 envelope
  const bad = parseRpc("not json");
  if (!bad.ok) {
    process.stdout.write("\nparse error path produced: " + bad.err + "\n");
  }
}

function main(): void {
  if (process.argv.includes("--serve")) {
    serveStdio();
    return;
  }
  demo();
}

main();
