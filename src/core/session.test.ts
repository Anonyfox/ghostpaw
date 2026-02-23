import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { createDatabase, type GhostpawDatabase } from "./database.js";
import { createSessionStore, type SessionStore } from "./session.js";

let db: GhostpawDatabase;
let store: SessionStore;

beforeEach(async () => {
  db = await createDatabase(":memory:");
  store = createSessionStore(db);
});

describe("SessionStore - session CRUD", () => {
  it("creates a new session with auto-generated id", () => {
    const session = store.createSession("my-chat");
    ok(session.id.length > 0);
    strictEqual(session.key, "my-chat");
    ok(session.createdAt > 0);
    strictEqual(session.tokensIn, 0);
    strictEqual(session.tokensOut, 0);
    strictEqual(session.headMessageId, null);
  });

  it("creates a session with custom model", () => {
    const session = store.createSession("chat", { model: "openai/gpt-4o" });
    strictEqual(session.model, "openai/gpt-4o");
  });

  it("creates a session with token budget", () => {
    const session = store.createSession("chat", { tokenBudget: 50_000 });
    strictEqual(session.tokenBudget, 50_000);
  });

  it("retrieves a session by id", () => {
    const created = store.createSession("s1");
    const found = store.getSession(created.id);
    ok(found);
    strictEqual(found.id, created.id);
    strictEqual(found.key, "s1");
  });

  it("retrieves a session by key", () => {
    store.createSession("unique-key");
    const found = store.getSessionByKey("unique-key");
    ok(found);
    strictEqual(found.key, "unique-key");
  });

  it("returns null for non-existent session", () => {
    strictEqual(store.getSession("nonexistent"), null);
    strictEqual(store.getSessionByKey("nonexistent"), null);
  });

  it("throws on duplicate key", () => {
    store.createSession("dup");
    throws(() => store.createSession("dup"));
  });

  it("lists all sessions ordered by last_active desc", () => {
    store.createSession("first");
    store.createSession("second");
    store.createSession("third");
    const list = store.listSessions();
    strictEqual(list.length, 3);
    ok(list[0]!.lastActive >= list[1]!.lastActive);
  });

  it("deletes a session and its messages", () => {
    const session = store.createSession("to-delete");
    store.addMessage(session.id, { role: "user", content: "hello" });
    store.deleteSession(session.id);
    strictEqual(store.getSession(session.id), null);
  });
});

describe("SessionStore - message tree", () => {
  it("adds a message to a session", () => {
    const session = store.createSession("chat");
    const msg = store.addMessage(session.id, { role: "user", content: "hello" });
    ok(msg.id.length > 0);
    strictEqual(msg.role, "user");
    strictEqual(msg.content, "hello");
    strictEqual(msg.sessionId, session.id);
  });

  it("auto-advances session head to the latest message", () => {
    const session = store.createSession("chat");
    const msg1 = store.addMessage(session.id, { role: "user", content: "a" });
    const msg2 = store.addMessage(session.id, {
      role: "assistant",
      content: "b",
      parentId: msg1.id,
    });
    const updated = store.getSession(session.id)!;
    strictEqual(updated.headMessageId, msg2.id);
  });

  it("builds the conversation history by walking from head to root", () => {
    const session = store.createSession("chat");
    const m1 = store.addMessage(session.id, { role: "user", content: "hello" });
    const m2 = store.addMessage(session.id, { role: "assistant", content: "hi", parentId: m1.id });
    const _m3 = store.addMessage(session.id, {
      role: "user",
      content: "how are you?",
      parentId: m2.id,
    });

    const history = store.getConversationHistory(session.id);
    strictEqual(history.length, 3);
    strictEqual(history[0]!.role, "user");
    strictEqual(history[0]!.content, "hello");
    strictEqual(history[2]!.role, "user");
    strictEqual(history[2]!.content, "how are you?");
  });

  it("returns empty history for a session with no messages", () => {
    const session = store.createSession("empty");
    const history = store.getConversationHistory(session.id);
    strictEqual(history.length, 0);
  });

  it("supports branching — two children from the same parent", () => {
    const session = store.createSession("chat");
    const root = store.addMessage(session.id, { role: "user", content: "hello" });
    const branch1 = store.addMessage(session.id, {
      role: "assistant",
      content: "hi!",
      parentId: root.id,
    });
    const branch2 = store.addMessage(session.id, {
      role: "assistant",
      content: "hey!",
      parentId: root.id,
    });

    store.setHead(session.id, branch1.id);
    const hist1 = store.getConversationHistory(session.id);
    strictEqual(hist1.length, 2);
    strictEqual(hist1[1]!.content, "hi!");

    store.setHead(session.id, branch2.id);
    const hist2 = store.getConversationHistory(session.id);
    strictEqual(hist2.length, 2);
    strictEqual(hist2[1]!.content, "hey!");
  });

  it("rewind — setHead to an earlier message", () => {
    const session = store.createSession("chat");
    const m1 = store.addMessage(session.id, { role: "user", content: "a" });
    const m2 = store.addMessage(session.id, { role: "assistant", content: "b", parentId: m1.id });
    store.addMessage(session.id, { role: "user", content: "c", parentId: m2.id });

    store.setHead(session.id, m1.id);
    const history = store.getConversationHistory(session.id);
    strictEqual(history.length, 1);
    strictEqual(history[0]!.content, "a");
  });

  it("records token usage on messages", () => {
    const session = store.createSession("chat");
    const msg = store.addMessage(session.id, {
      role: "assistant",
      content: "response",
      tokensIn: 500,
      tokensOut: 200,
      model: "claude-sonnet-4",
    });
    strictEqual(msg.tokensIn, 500);
    strictEqual(msg.tokensOut, 200);
    strictEqual(msg.model, "claude-sonnet-4");
  });

  it("updateSessionTokens aggregates to session level", () => {
    const session = store.createSession("chat");
    store.addMessage(session.id, { role: "user", content: "a" });
    store.addMessage(session.id, { role: "assistant", content: "b", tokensIn: 100, tokensOut: 50 });
    store.updateSessionTokens(session.id, 100, 50);

    const updated = store.getSession(session.id)!;
    strictEqual(updated.tokensIn, 100);
    strictEqual(updated.tokensOut, 50);
  });

  it("getMessage retrieves a single message by id", () => {
    const session = store.createSession("chat");
    const msg = store.addMessage(session.id, { role: "user", content: "hello" });
    const found = store.getMessage(msg.id);
    ok(found);
    strictEqual(found.content, "hello");
  });

  it("getMessage returns null for nonexistent id", () => {
    strictEqual(store.getMessage("fake"), null);
  });

  it("handles compaction messages", () => {
    const session = store.createSession("chat");
    const msg = store.addMessage(session.id, {
      role: "system",
      content: "compacted summary",
      isCompaction: true,
    });
    strictEqual(msg.isCompaction, true);
  });
});
