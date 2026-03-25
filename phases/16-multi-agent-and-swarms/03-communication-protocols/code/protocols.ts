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

type AgentCard = {
  name: string;
  description: string;
  capabilities: string[];
  endpoint: string;
  supportedModes: ("sync" | "async" | "stream")[];
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

  subscribe(
    agentName: string,
    handler: (msg: AgentMessage) => Promise<unknown>
  ) {
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
    const researchRequest = createMessage("request", "coder", target.name, {
      task: "Research React 19 features",
    });

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
