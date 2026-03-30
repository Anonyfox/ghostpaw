import assert from "node:assert";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { Chat, Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import type { SoulIds } from "../../runtime.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { openMemorySoulsDatabase } from "../db/open_souls.ts";
import { bootstrapSouls } from "../souls/bootstrap.ts";
import { executeDelegation } from "./handler.ts";

function patchChatStream(response: string): void {
  mock.method(Chat.prototype, "stream", async function* stream(this: Chat) {
    this.addMessage(new Message("assistant", response));
    yield response;
  });
}

let db: DatabaseHandle;
let soulsDb: DatabaseHandle;
let soulIds: SoulIds;

beforeEach(() => {
  db = openMemoryDatabase();
  soulsDb = openMemorySoulsDatabase();
  soulIds = bootstrapSouls(soulsDb);
});

afterEach(() => {
  soulsDb.close();
  db.close();
  mock.restoreAll();
});

describe("executeDelegation", () => {
  it("creates a delegate session and returns the specialist response", async () => {
    patchChatStream("Task completed successfully.");

    const result = await executeDelegation({
      db,
      soulsDb,
      soulId: soulIds.ghostpaw,
      task: "Build a hello world module",
      tools: [],
      model: "test-model",
    });

    assert.strictEqual(result.succeeded, true);
    assert.strictEqual(result.content, "Task completed successfully.");
    assert.strictEqual(result.soulId, soulIds.ghostpaw);
    assert.strictEqual(typeof result.sessionId, "number");
    assert.ok(result.sessionId > 0);
  });

  it("creates a session with purpose=delegate and correct soul_id", async () => {
    patchChatStream("Done.");

    const result = await executeDelegation({
      db,
      soulsDb,
      soulId: soulIds.mentor,
      task: "Review soul health",
      tools: [],
      model: "test-model",
    });

    const session = db
      .prepare("SELECT purpose, soul_id, title FROM sessions WHERE id = ?")
      .get(result.sessionId) as { purpose: string; soul_id: number; title: string };

    assert.strictEqual(session.purpose, "delegate");
    assert.strictEqual(session.soul_id, soulIds.mentor);
    assert.strictEqual(session.title, `delegate:${soulIds.mentor}`);
  });

  it("seals the session tail after execution", async () => {
    patchChatStream("Analysis complete.");

    const result = await executeDelegation({
      db,
      soulsDb,
      soulId: soulIds.ghostpaw,
      task: "Analyze the codebase",
      tools: [],
      model: "test-model",
    });

    const sealed = db
      .prepare("SELECT COUNT(*) as c FROM messages WHERE session_id = ? AND sealed_at IS NOT NULL")
      .get(result.sessionId) as { c: number };

    assert.ok(sealed.c > 0, "delegate session should have sealed messages");
  });

  it("seals the session even when the LLM throws", async () => {
    mock.method(Chat.prototype, "stream", async function* stream(this: Chat) {
      this.addMessage(new Message("assistant", "partial"));
      yield "partial";
      throw new Error("API timeout");
    });

    const result = await executeDelegation({
      db,
      soulsDb,
      soulId: soulIds.ghostpaw,
      task: "This will fail",
      tools: [],
      model: "test-model",
    });

    assert.strictEqual(result.succeeded, false);
    assert.ok(result.content.includes("API timeout"));

    const sealed = db
      .prepare("SELECT COUNT(*) as c FROM messages WHERE session_id = ? AND sealed_at IS NOT NULL")
      .get(result.sessionId) as { c: number };

    assert.ok(sealed.c > 0, "session sealed even after error");
  });

  it("prepends the delegation preamble to the user message", async () => {
    let capturedMessages: string[] = [];
    mock.method(Chat.prototype, "stream", async function* stream(this: Chat) {
      capturedMessages = this.messages.map((m) => m.content ?? "");
      this.addMessage(new Message("assistant", "ok"));
      yield "ok";
    });

    await executeDelegation({
      db,
      soulsDb,
      soulId: soulIds.ghostpaw,
      task: "Do the thing",
      tools: [],
      model: "test-model",
    });

    const userMsg = capturedMessages.find((m) => m.includes("Do the thing"));
    assert.ok(userMsg, "user message should contain the task");
    assert.ok(
      userMsg!.includes("delegated task"),
      "user message should contain the delegation preamble",
    );
  });
});
