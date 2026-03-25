# Communication Protocols

> Agents that can't speak the same language aren't a team — they're strangers shouting into the void.

**Type:** Learn
**Languages:** TypeScript
**Prerequisites:** Phase 14 (Agent Engineering), Lesson 16.01 (Why Multi-Agent)
**Time:** ~75 minutes

## The Problem

You split your system into multiple agents. A researcher, a coder, a reviewer. They're great at their individual jobs. But now you need them to actually talk to each other.

Your first attempt is obvious: pass strings around. The researcher returns a blob of text, the coder parses it however it can. It works — until the coder misinterprets a research summary, or two agents deadlock waiting for each other, or you need agents built by different teams (or different companies) to collaborate. Suddenly "just pass strings" falls apart.

This is the communication protocol problem. Without a shared contract for how agents exchange information, multi-agent systems are fragile, unauditable, and impossible to scale beyond a handful of agents you personally wrote. The AI ecosystem has responded with four protocols, each solving a different slice of this problem: **MCP** for tool access, **A2A** for agent collaboration, **ACP** for enterprise compliance, and **ANP** for decentralized trust.

## The Concept

### The Protocol Landscape

Think of these four protocols as layers, each addressing a different question:

```text
┌─────────────────────────────────────────────────────────┐
│                    ANP                                   │
│         "How do agents trust strangers?"                │
│    Decentralized identity, open networks, trust graphs  │
├─────────────────────────────────────────────────────────┤
│                    A2A                                   │
│       "How do agents collaborate on goals?"             │
│    Negotiation, task delegation, intent sharing         │
├─────────────────────────────────────────────────────────┤
│                    ACP                                   │
│      "How do agents talk in regulated systems?"         │
│    Structured messaging, audit trails, compliance       │
├─────────────────────────────────────────────────────────┤
│                    MCP                                   │
│       "How does an agent use a tool?"                   │
│    Tool discovery, execution, context sharing           │
└─────────────────────────────────────────────────────────┘
```

They're not competitors. They solve different problems at different levels.

### MCP — Model Context Protocol (Recap)

MCP is covered in depth in Phase 13. Quick recap: MCP standardizes how an LLM connects to external tools and data sources. It's a **client-server** protocol — the agent (client) discovers and calls tools exposed by a server.

```text
┌──────────┐    "list tools"     ┌──────────────┐
│  Agent   │ ──────────────────▸ │  MCP Server  │
│ (client) │                     │  (database,  │
│          │ ◂────────────────── │   API, file  │
│          │   tool definitions  │   system)    │
│          │                     └──────────────┘
│          │    "call tool X"
│          │ ──────────────────▸ ┌──────────────┐
│          │ ◂────────────────── │  MCP Server  │
└──────────┘       result        └──────────────┘
```

MCP is about **agent-to-tool** communication. It doesn't help agents talk to each other.

### A2A — Agent2Agent Protocol

**Created by:** Google
**Problem:** How do autonomous agents collaborate, negotiate, and delegate tasks to each other?

A2A is the protocol for **peer-to-peer agent collaboration**. Where MCP connects an agent to tools, A2A connects an agent to other agents. Each agent publishes an **Agent Card** — a machine-readable description of what it can do — and other agents discover, negotiate with, and delegate tasks to it.

```text
┌──────────────┐                          ┌──────────────┐
│   Agent A    │                          │   Agent B    │
│              │    1. Discover           │              │
│  "I need     │ ──────────────────────▸  │  Agent Card: │
│   market     │    (fetch agent card)    │  "I analyze  │
│   analysis"  │                          │   financial  │
│              │    2. Negotiate          │   data"      │
│              │ ◂──────────────────────▸ │              │
│              │    (capabilities, terms) │              │
│              │                          │              │
│              │    3. Delegate task      │              │
│              │ ──────────────────────▸  │              │
│              │                          │              │
│              │    4. Stream results     │              │
│              │ ◂────────────────────── │              │
└──────────────┘                          └──────────────┘
```

Key features:

- **Agent Cards** — JSON documents describing an agent's capabilities, endpoints, and supported interaction modes. Think of it as a resume that other agents can read programmatically.
- **Task lifecycle** — tasks move through defined states: submitted → working → input-required → completed/failed. Both sides can track progress.
- **Negotiation** — agents can agree on goals, share resource constraints, and delegate subtasks. Not just "do this" but "can you do this, and under what conditions?"
- **Multimodal** — supports text, audio, images, and structured data in messages.
- **Streaming** — long-running tasks can stream partial results back.

When to use A2A: when you need agents to discover each other's capabilities at runtime and collaborate dynamically. Think autonomous fleets, distributed research teams, or any system where agents from different vendors need to work together.

### ACP — Agent Communication Protocol

**Created by:** IBM
**Problem:** How do agents communicate in regulated industries where every interaction must be auditable and compliant?

ACP is the **enterprise protocol**. It doesn't care about decentralized discovery or peer negotiation — it cares about structured, traceable, compliant communication between agents in controlled environments.

```text
┌──────────────┐                          ┌──────────────┐
│   Agent A    │                          │   Agent B    │
│              │                          │              │
│  "Transfer   │    JSON-LD message       │  "Process    │
│   patient    │ ──────────────────────▸  │   patient    │
│   record"    │   (structured, signed,   │   intake"    │
│              │    schema-validated)      │              │
│              │                          │              │
│              │    ┌──────────────────┐  │              │
│              │    │   Audit Log      │  │              │
│              │    │                  │  │              │
│              │    │ timestamp: ...   │  │              │
│              │    │ from: Agent A    │  │              │
│              │    │ to: Agent B      │  │              │
│              │    │ payload: {...}   │  │              │
│              │    │ compliance: OK   │  │              │
│              │    └──────────────────┘  │              │
└──────────────┘                          └──────────────┘
```

Key features:

- **JSON-LD messaging** — all messages use JSON-LD (Linked Data), making them machine-readable with unambiguous semantics. No "what did the agent mean by that?" — the schema tells you.
- **Comprehensive audit trails** — every message is logged with sender, receiver, timestamp, payload, and compliance status. Required for healthcare, finance, and government.
- **Built-in compliance** — regulatory requirements (HIPAA, SOX, GDPR) are encoded into the protocol, not bolted on as an afterthought.
- **Enterprise integration** — designed to plug into existing IT ecosystems: message brokers, identity providers, access control systems.

When to use ACP: when agents operate in regulated industries and every interaction needs a paper trail. Financial transaction agents, healthcare information exchange, regulatory audit systems.

### ANP — Agent Network Protocol

**Created by:** Open standard (community-driven, no single corporate owner)
**Problem:** How do agents trust and collaborate across organizational boundaries without a central authority?

ANP is the **decentralized protocol**. While A2A assumes agents can discover each other through known endpoints, ANP builds a trust layer using decentralized identities. Any agent can join the network, prove its identity cryptographically, and build trust through endorsements from other agents.

```text
┌──────────────┐          ┌──────────────┐
│   Agent A    │          │   Agent B    │
│              │          │              │
│  DID:        │  verify  │  DID:        │
│  did:web:    │◂────────▸│  did:web:    │
│  agent-a.com │          │  agent-b.com │
│              │          │              │
│  Endorsed by:│          │  Endorsed by:│
│  - Agent C   │          │  - Agent D   │
│  - Agent D   │          │  - Agent E   │
└──────┬───────┘          └──────┬───────┘
       │                         │
       │    ┌──────────────┐     │
       └───▸│  Trust Graph │◂────┘
            │              │
            │  A ──▸ C     │
            │  A ──▸ D     │
            │  B ──▸ D     │
            │  B ──▸ E     │
            │              │
            │  Shared: D   │
            │  (trust      │
            │   anchor)    │
            └──────────────┘
```

Key features:

- **Decentralized Identity (DID)** — each agent has a cryptographically verifiable identity. No central registry. An agent proves who it is the same way a website proves its identity with TLS — but without needing a certificate authority.
- **Trust frameworks** — agents build trust through endorsements. If Agent C trusts Agent A, and you trust Agent C, you have a path to trusting Agent A. This is a trust graph, not a trust hierarchy.
- **Standardized messaging with ontologies** — messages follow defined vocabularies so agents from completely different ecosystems can understand each other.
- **Open governance** — the protocol evolves through community contributions, not corporate roadmaps.

When to use ANP: when agents from different organizations, ecosystems, or trust domains need to collaborate without a central coordinator. Decentralized AI marketplaces, open research networks, cross-organizational agent federations.

### Comparison

| | MCP | A2A | ACP | ANP |
|---|---|---|---|---|
| **Created by** | Anthropic | Google | IBM | Community |
| **Primary use** | Agent ↔ Tool | Agent ↔ Agent | Agent ↔ Agent | Agent ↔ Agent |
| **Discovery** | Tool listing | Agent Cards | Registry | Decentralized (DID) |
| **Trust model** | Implicit (local) | Endpoint-based | Enterprise IAM | Cryptographic (DID) |
| **Audit** | N/A | Basic | Comprehensive | On-chain optional |
| **Topology** | Client-server | Peer-to-peer | Hub-and-spoke | Peer-to-peer mesh |
| **Best for** | Tools & data | Dynamic collab | Regulated industries | Open networks |

### How They Work Together

These protocols are not mutually exclusive. A realistic enterprise system might use all four:

```text
┌──────────────────────────────────────────────────────────┐
│                     Your Organization                     │
│                                                          │
│   ┌──────────┐   A2A    ┌──────────┐                    │
│   │ Research │ ◂──────▸ │  Coding  │                    │
│   │  Agent   │          │  Agent   │                    │
│   └────┬─────┘          └────┬─────┘                    │
│        │ MCP                 │ MCP                      │
│   ┌────▼─────┐          ┌────▼─────┐                    │
│   │ Search   │          │  GitHub  │                    │
│   │ Server   │          │  Server  │                    │
│   └──────────┘          └──────────┘                    │
│                                                          │
│   All internal messages logged via ACP                   │
│                                                          │
├──────────────────────────────────────────────────────────┤
│         │              ANP               │               │
│         ▼                                ▼               │
│   ┌──────────┐                    ┌──────────┐          │
│   │ External │                    │ Partner  │          │
│   │ Agent    │                    │ Agent    │          │
│   │ (DID     │                    │ (DID     │          │
│   │  verified)                    │  verified)          │
│   └──────────┘                    └──────────┘          │
└──────────────────────────────────────────────────────────┘
```

- **MCP** connects each agent to its tools
- **A2A** handles collaboration between your internal agents
- **ACP** wraps all messages in audit-compliant envelopes
- **ANP** enables trust with external agents you don't control

## Build It

### Step 1: Define Message Types

Before picking a protocol, every multi-agent system needs a message format. Start with the basics:

```typescript
import crypto from "node:crypto";

type MessageType = "request" | "response" | "notify" | "negotiate";

type AgentMessage = {
  id: string;
  type: MessageType;
  from: string;
  to: string;
  timestamp: number;
  payload: unknown;
  replyTo?: string;
};

function createMessage(
  type: MessageType,
  from: string,
  to: string,
  payload: unknown,
  replyTo?: string
): AgentMessage {
  return {
    id: crypto.randomUUID(),
    type,
    from,
    to,
    timestamp: Date.now(),
    payload,
    replyTo,
  };
}
```

### Step 2: Agent Cards (A2A Style)

Each agent advertises what it can do:

```typescript
type AgentCard = {
  name: string;
  description: string;
  capabilities: string[];
  endpoint: string;
  supportedModes: ("sync" | "async" | "stream")[];
};

const researcherCard: AgentCard = {
  name: "researcher",
  description: "Reads documentation and summarizes findings",
  capabilities: ["web_search", "doc_analysis", "summarization"],
  endpoint: "local://researcher",
  supportedModes: ["sync", "async"],
};

const coderCard: AgentCard = {
  name: "coder",
  description: "Writes code based on specifications",
  capabilities: ["code_generation", "refactoring", "testing"],
  endpoint: "local://coder",
  supportedModes: ["sync"],
};

class AgentRegistry {
  private agents: Map<string, AgentCard> = new Map();

  register(card: AgentCard) {
    this.agents.set(card.name, card);
  }

  discover(capability: string): AgentCard[] {
    return [...this.agents.values()].filter((card) =>
      card.capabilities.includes(capability)
    );
  }

  resolve(name: string): AgentCard | undefined {
    return this.agents.get(name);
  }
}
```

### Step 3: Auditable Message Bus (ACP Style)

Wrap communication in an audit trail:

```typescript
type AuditEntry = {
  message: AgentMessage;
  receivedAt: number;
  processedAt?: number;
  status: "delivered" | "processed" | "failed";
  error?: string;
};

class AuditableMessageBus {
  private log: AuditEntry[] = [];
  private handlers: Map<string, (msg: AgentMessage) => Promise<unknown>> =
    new Map();

  subscribe(agentName: string, handler: (msg: AgentMessage) => Promise<unknown>) {
    this.handlers.set(agentName, handler);
  }

  async send(message: AgentMessage): Promise<unknown> {
    const entry: AuditEntry = {
      message: structuredClone(message),
      receivedAt: Date.now(),
      status: "delivered",
    };
    this.log.push(entry);

    const handler = this.handlers.get(message.to);
    if (!handler) {
      entry.status = "failed";
      entry.error = `No handler registered for ${message.to}`;
      throw new Error(entry.error);
    }

    try {
      const result = await handler(message);
      entry.processedAt = Date.now();
      entry.status = "processed";
      return result;
    } catch (err) {
      entry.status = "failed";
      entry.error = String(err);
      throw err;
    }
  }

  getAuditLog(): AuditEntry[] {
    return structuredClone(this.log);
  }

  getAuditLogFor(agentName: string): AuditEntry[] {
    return structuredClone(
      this.log.filter(
        (e) => e.message.from === agentName || e.message.to === agentName
      )
    );
  }
}
```

### Step 4: Trust Verification (ANP Style)

A minimal trust model using endorsements:

```typescript
type AgentIdentity = {
  did: string;
  publicKey: string;
  endorsements: string[];
};

class TrustGraph {
  private identities: Map<string, AgentIdentity> = new Map();

  register(identity: AgentIdentity) {
    this.identities.set(identity.did, identity);
  }

  trustLevel(fromDid: string, toDid: string): number {
    const from = this.identities.get(fromDid);
    const to = this.identities.get(toDid);
    if (!from || !to) return 0;

    const sharedEndorsements = to.endorsements.filter((e) =>
      from.endorsements.includes(e)
    );

    if (from.endorsements.includes(toDid)) return 1.0;
    if (sharedEndorsements.length > 0)
      return Math.min(1.0, 0.5 + sharedEndorsements.length * 0.1);
    return 0;
  }

  canTrust(fromDid: string, toDid: string, threshold = 0.5): boolean {
    return this.trustLevel(fromDid, toDid) >= threshold;
  }
}
```

### Step 5: Wire It All Together

Combine discovery, auditing, and trust into a working multi-agent system:

```typescript
async function protocolDemo() {
  const registry = new AgentRegistry();
  registry.register(researcherCard);
  registry.register(coderCard);

  const bus = new AuditableMessageBus();

  const trust = new TrustGraph();
  trust.register({
    did: "did:web:researcher.local",
    publicKey: "pk-researcher",
    endorsements: ["did:web:org.local"],
  });
  trust.register({
    did: "did:web:coder.local",
    publicKey: "pk-coder",
    endorsements: ["did:web:org.local"],
  });

  bus.subscribe("researcher", async (msg) => {
    console.log(`[researcher] received: ${JSON.stringify(msg.payload)}`);
    return { findings: "React 19 uses a compiler for automatic memoization" };
  });

  bus.subscribe("coder", async (msg) => {
    console.log(`[coder] received: ${JSON.stringify(msg.payload)}`);
    return { code: "function App() { return <div>Hello</div>; }" };
  });

  const agents = registry.discover("summarization");
  console.log(`Found ${agents.length} agent(s) with summarization capability`);

  if (agents.length === 0) {
    console.log("No agents found with summarization capability");
    return;
  }

  const target = agents[0];
  const canTrust = trust.canTrust(
    "did:web:coder.local",
    `did:web:${target.name}.local`
  );
  console.log(`Coder trusts ${target.name}: ${canTrust}`);

  if (canTrust) {
    const researchRequest = createMessage(
      "request",
      "coder",
      target.name,
      { task: "Research React 19 features" }
    );

    const findings = await bus.send(researchRequest);
    console.log(`Research findings:`, findings);

    console.log(`\nAudit log: ${bus.getAuditLog().length} entries`);
    for (const entry of bus.getAuditLog()) {
      console.log(
        `  ${entry.message.from} -> ${entry.message.to}: ${entry.status}`
      );
    }
  }
}

protocolDemo();
```

## Use It

### Real Implementations

**A2A** — Google's [A2A specification](https://github.com/google/A2A) is open-source. SDKs exist for Python and TypeScript. If your agents need dynamic discovery and collaboration, start here.

**ACP** — IBM's protocol is designed for enterprise. If you're in healthcare, finance, or government — where "who said what and when" is a legal requirement — ACP gives you auditability without building it yourself.

**ANP** — the community-driven standard is still maturing. Useful today for research and experimental decentralized systems. Watch this space — as agents cross organizational boundaries, decentralized trust becomes essential.

**MCP** — already covered in Phase 13. If you want agents to use tools, MCP is the standard.

### Picking the Right Protocol

```text
Do agents need to use tools?
├── Yes → MCP
└── No
    │
    Do agents need to talk to each other?
    ├── No → You don't need a protocol
    └── Yes
        │
        Are they all within your organization?
        ├── Yes
        │   ├── Regulated industry? → ACP
        │   └── Not regulated? → A2A (or simple message passing)
        └── No
            ├── Shared broker or federation? → A2A + message broker
            └── No central authority? → ANP + A2A
```

## Ship It

This lesson produces:
- `outputs/prompt-protocol-selector.md` — a prompt that helps you choose which agent communication protocol to use for your system

## Exercises

1. Add a `negotiate` method to the `AgentRegistry` where two agents exchange capability requirements and agree on a task contract before execution
2. Extend the `AuditableMessageBus` with message expiration: messages older than N seconds should be marked as "expired" and handlers should refuse to process them
3. Build a multi-hop trust resolution for the `TrustGraph`: if A trusts B and B trusts C, A can transitionally trust C with a decayed trust score — implement breadth-first trust path discovery

## Key Terms

| Term | What people say | What it actually means |
|------|----------------|----------------------|
| MCP | "The protocol for AI tools" | A client-server protocol for agents to discover and use tools. Agent-to-tool, not agent-to-agent. |
| A2A | "Google's agent protocol" | A peer-to-peer protocol for agent collaboration: discovery via Agent Cards, task delegation, negotiation, and streaming results. |
| ACP | "Enterprise agent messaging" | A structured messaging protocol with JSON-LD, comprehensive audit trails, and built-in compliance for regulated industries. |
| ANP | "Decentralized agent identity" | A community-driven protocol using DIDs and trust graphs so agents can verify each other without a central authority. |
| Agent Card | "An agent's business card" | A machine-readable JSON document describing an agent's capabilities, endpoint, and supported interaction modes. Used by A2A for discovery. |
| DID | "Decentralized ID" | A W3C standard for cryptographically verifiable identities that don't depend on a central registry. Used by ANP for trust. |
| JSON-LD | "JSON with meaning" | JSON for Linked Data — extends JSON with a `@context` field that gives unambiguous meaning to every key. Used by ACP for structured messaging. |

## Further Reading

- [Google A2A specification](https://github.com/google/A2A) — the official spec and SDKs for Agent2Agent protocol
- [Model Context Protocol docs](https://modelcontextprotocol.io/) — Anthropic's MCP specification (covered in Phase 13)
- [W3C Decentralized Identifiers (DIDs)](https://www.w3.org/TR/did-core/) — the identity standard underpinning ANP
- [JSON-LD specification](https://www.w3.org/TR/json-ld11/) — the structured data format used by ACP
- [FIPA Agent Communication Language](http://www.fipa.org/specs/fipa00061/SC00061G.html) — the academic precursor to modern agent communication protocols
