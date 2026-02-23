import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { formatConversation, parseLearnings } from "./absorb.js";
import { createDatabase, type GhostpawDatabase } from "./database.js";
import { createMemoryStore, type MemoryStore } from "./memory.js";
import { createSessionStore, type SessionStore } from "./session.js";
import type { Message } from "./session.js";

let db: GhostpawDatabase;
let sessions: SessionStore;
let memory: MemoryStore;

beforeEach(async () => {
  db = await createDatabase(":memory:");
  sessions = createSessionStore(db);
  memory = createMemoryStore(db);
});

afterEach(() => {
  db.close();
});

// ── parseLearnings ──────────────────────────────────────────────────────────

describe("parseLearnings", () => {
  it("parses valid JSON response", () => {
    const result = parseLearnings('{"learnings": ["User prefers tabs over spaces", "Deploy requires --force flag"]}');
    deepStrictEqual(result, ["User prefers tabs over spaces", "Deploy requires --force flag"]);
  });

  it("parses JSON with surrounding text", () => {
    const result = parseLearnings('Here are the learnings:\n{"learnings": ["Always run tests first"]}\nDone.');
    deepStrictEqual(result, ["Always run tests first"]);
  });

  it("filters out short strings (<=10 chars)", () => {
    const result = parseLearnings('{"learnings": ["Good one", "This is a real learning worth keeping"]}');
    strictEqual(result.length, 1);
    strictEqual(result[0], "This is a real learning worth keeping");
  });

  it("filters out non-string entries", () => {
    const result = parseLearnings('{"learnings": ["Valid learning here", 42, null, true]}');
    strictEqual(result.length, 1);
  });

  it("returns empty for missing learnings key", () => {
    const result = parseLearnings('{"results": ["something"]}');
    deepStrictEqual(result, []);
  });

  it("returns empty for no JSON at all", () => {
    const result = parseLearnings("No structured output here");
    deepStrictEqual(result, []);
  });

  it("falls back to line-based extraction on malformed JSON with braces", () => {
    const result = parseLearnings('{"learnings: broken}\n- User prefers dark mode for all interfaces\n- Always check return values');
    ok(result.length >= 1);
    ok(result.some((l) => l.includes("dark mode")));
  });

  it("line-based fallback strips list markers", () => {
    const result = parseLearnings("{invalid json}\n1. First real learning to keep\n2. Second real learning to keep");
    ok(result.length >= 2);
    ok(result[0].startsWith("First"));
    ok(result[1].startsWith("Second"));
  });

  it("line-based fallback filters short lines", () => {
    const result = parseLearnings("{bad}\n- ok\n- This is actually a good learning");
    strictEqual(result.length, 1);
    ok(result[0].includes("good learning"));
  });

  it("returns empty for no braces at all (no fallback)", () => {
    const result = parseLearnings("No JSON structure here at all");
    deepStrictEqual(result, []);
  });

  it("handles empty learnings array", () => {
    const result = parseLearnings('{"learnings": []}');
    deepStrictEqual(result, []);
  });

  it("handles empty string", () => {
    const result = parseLearnings("");
    deepStrictEqual(result, []);
  });

  it("handles deeply nested JSON without crashing", () => {
    const nested = '{"learnings": ["outer"], "meta": {"nested": {"deep": true}}}';
    const result = parseLearnings(nested);
    strictEqual(result.length, 0); // "outer" is only 5 chars
  });
});

// ── formatConversation ──────────────────────────────────────────────────────

function makeMessage(role: "user" | "assistant" | "system", content: string | null, opts?: { isCompaction?: boolean }): Message {
  return {
    id: `msg-${Math.random()}`,
    sessionId: "s1",
    parentId: null,
    role,
    content,
    model: null,
    tokensIn: 0,
    tokensOut: 0,
    createdAt: Date.now(),
    isCompaction: opts?.isCompaction ?? false,
  };
}

describe("formatConversation", () => {
  it("formats user and assistant messages", () => {
    const result = formatConversation([
      makeMessage("user", "Hello there"),
      makeMessage("assistant", "Hi, how can I help?"),
    ]);
    ok(result.includes("User: Hello there"));
    ok(result.includes("Agent: Hi, how can I help?"));
  });

  it("labels system messages as System", () => {
    const result = formatConversation([makeMessage("system", "You are helpful")]);
    ok(result.includes("System: You are helpful"));
  });

  it("skips null content messages", () => {
    const result = formatConversation([
      makeMessage("user", "real message"),
      makeMessage("assistant", null),
    ]);
    ok(result.includes("real message"));
    ok(!result.includes("Agent:"));
  });

  it("skips compaction messages", () => {
    const result = formatConversation([
      makeMessage("user", "real message"),
      makeMessage("system", "compacted summary", { isCompaction: true }),
    ]);
    ok(result.includes("real message"));
    ok(!result.includes("compacted summary"));
  });

  it("truncates individual messages over 2000 chars", () => {
    const longContent = "x".repeat(3000);
    const result = formatConversation([makeMessage("user", longContent)]);
    ok(result.length < 3000);
    ok(result.endsWith("..."));
  });

  it("returns empty string for empty message list", () => {
    strictEqual(formatConversation([]), "");
  });

  it("separates messages with double newlines", () => {
    const result = formatConversation([
      makeMessage("user", "first message here"),
      makeMessage("assistant", "second message here"),
    ]);
    ok(result.includes("\n\n"));
  });
});

// ── session store absorption methods ────────────────────────────────────────

describe("session store - absorption methods", () => {
  it("countUnabsorbed returns 0 initially", () => {
    strictEqual(sessions.countUnabsorbed(), 0);
  });

  it("countUnabsorbed counts sessions with messages", () => {
    const s1 = sessions.createSession("s1");
    sessions.addMessage(s1.id, { role: "user", content: "hello" });

    const s2 = sessions.createSession("s2");
    sessions.addMessage(s2.id, { role: "user", content: "world" });

    sessions.createSession("s3-empty");

    strictEqual(sessions.countUnabsorbed(), 2);
  });

  it("listUnabsorbed returns sessions ordered by last_active ASC", () => {
    const s1 = sessions.createSession("s1");
    sessions.addMessage(s1.id, { role: "user", content: "first" });

    const s2 = sessions.createSession("s2");
    sessions.addMessage(s2.id, { role: "user", content: "second" });

    const list = sessions.listUnabsorbed();
    strictEqual(list.length, 2);
    ok(list[0].lastActive <= list[1].lastActive);
  });

  it("listUnabsorbed excludes sessions without head_message_id", () => {
    sessions.createSession("empty-session");
    strictEqual(sessions.listUnabsorbed().length, 0);
  });

  it("markAbsorbed sets timestamp", () => {
    const s1 = sessions.createSession("s1");
    sessions.addMessage(s1.id, { role: "user", content: "hello" });

    sessions.markAbsorbed(s1.id);

    const updated = sessions.getSession(s1.id);
    ok(updated);
    ok(updated.absorbedAt !== null);
    ok(updated.absorbedAt! > 0);
  });

  it("markAbsorbed removes from unabsorbed list", () => {
    const s1 = sessions.createSession("s1");
    sessions.addMessage(s1.id, { role: "user", content: "hello" });

    sessions.markAbsorbed(s1.id);

    strictEqual(sessions.countUnabsorbed(), 0);
    strictEqual(sessions.listUnabsorbed().length, 0);
  });

  it("deleteOldAbsorbed removes old absorbed sessions", () => {
    const s1 = sessions.createSession("s1");
    sessions.addMessage(s1.id, { role: "user", content: "hello" });
    sessions.markAbsorbed(s1.id);

    db.sqlite.prepare("UPDATE sessions SET absorbed_at = ? WHERE id = ?").run(
      Date.now() - 100_000,
      s1.id,
    );

    const deleted = sessions.deleteOldAbsorbed(50_000);
    strictEqual(deleted, 1);
    strictEqual(sessions.getSession(s1.id), null);
  });

  it("deleteOldAbsorbed keeps recent absorbed sessions", () => {
    const s1 = sessions.createSession("s1");
    sessions.addMessage(s1.id, { role: "user", content: "hello" });
    sessions.markAbsorbed(s1.id);

    const deleted = sessions.deleteOldAbsorbed(50_000);
    strictEqual(deleted, 0);
    ok(sessions.getSession(s1.id) !== null);
  });

  it("deleteOldAbsorbed does not touch unabsorbed sessions", () => {
    const s1 = sessions.createSession("s1");
    sessions.addMessage(s1.id, { role: "user", content: "hello" });

    const deleted = sessions.deleteOldAbsorbed(0);
    strictEqual(deleted, 0);
    ok(sessions.getSession(s1.id) !== null);
  });

  it("deleteOldAbsorbed cascades to messages and runs", () => {
    const s1 = sessions.createSession("s1");
    sessions.addMessage(s1.id, { role: "user", content: "hello" });
    sessions.addMessage(s1.id, { role: "assistant", content: "world" });
    sessions.markAbsorbed(s1.id);

    db.sqlite.prepare("UPDATE sessions SET absorbed_at = ? WHERE id = ?").run(
      Date.now() - 100_000,
      s1.id,
    );

    sessions.deleteOldAbsorbed(50_000);

    const msgs = sessions.getConversationHistory(s1.id);
    strictEqual(msgs.length, 0);
  });

  it("deleteOldAbsorbed preserves memories (intentional orphan)", () => {
    const s1 = sessions.createSession("s1");
    sessions.addMessage(s1.id, { role: "user", content: "hello" });
    sessions.markAbsorbed(s1.id);

    memory.store("learned from session", [], { source: "absorbed", sessionId: s1.id });

    db.sqlite.prepare("UPDATE sessions SET absorbed_at = ? WHERE id = ?").run(
      Date.now() - 100_000,
      s1.id,
    );

    sessions.deleteOldAbsorbed(50_000);

    strictEqual(sessions.getSession(s1.id), null);
    strictEqual(memory.count(), 1);
  });
});

// ── schema migration ────────────────────────────────────────────────────────

describe("schema migration - absorbed_at column", () => {
  it("absorbed_at column exists in sessions table", () => {
    const cols = db.sqlite
      .prepare("PRAGMA table_info(sessions)")
      .all() as { name: string }[];
    ok(cols.some((c) => c.name === "absorbed_at"));
  });

  it("new sessions have null absorbed_at", () => {
    const s = sessions.createSession("test");
    strictEqual(s.absorbedAt, null);
  });
});

// ── module exports ──────────────────────────────────────────────────────────

describe("absorb module exports", () => {
  it("exports required functions", async () => {
    const mod = await import("./absorb.js");
    strictEqual(typeof mod.absorbSessions, "function");
    strictEqual(typeof mod.countUnabsorbedSessions, "function");
    strictEqual(typeof mod.parseLearnings, "function");
    strictEqual(typeof mod.formatConversation, "function");
  });

  it("countUnabsorbedSessions delegates to session store", async () => {
    const mod = await import("./absorb.js");
    const s1 = sessions.createSession("s1");
    sessions.addMessage(s1.id, { role: "user", content: "hello" });

    strictEqual(mod.countUnabsorbedSessions(sessions), 1);
    sessions.markAbsorbed(s1.id);
    strictEqual(mod.countUnabsorbedSessions(sessions), 0);
  });
});
