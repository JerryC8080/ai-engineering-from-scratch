import type { AuditLog } from "./agent.js";
import { dispatchAgent } from "./agent.js";
import type { IssuePayload, PingPayload, RouteResult } from "./types.js";

export function route(audit: AuditLog, event: string, payload: unknown): RouteResult {
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
    const branch = dispatchAgent(audit, repo, issue.number, issue.title);
    return { code: 202, body: { dispatched: true, branch } };
  }
  if (event === "pull_request") {
    audit.log({
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
