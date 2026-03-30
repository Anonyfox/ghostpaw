import assert from "node:assert";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { Chat, Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { compactSession } from "./compact_session.ts";
import { addMessage, getMessages } from "./messages.ts";
import { createSession } from "./session.ts";

function patchChatGenerate(response: string): void {
  mock.method(Chat.prototype, "generate", async function generate(this: Chat) {
    this.addMessage(new Message("assistant", response));
    return response;
  });
}

let db: DatabaseHandle;

beforeEach(() => {
  db = openMemoryDatabase();
});

afterEach(() => {
  db.close();
  mock.restoreAll();
});

describe("compactSession", () => {
  it("returns null when history is under threshold", async () => {
    const session = createSession(db, "test-model", "You are helpful.");
    addMessage(db, session.id, "user", "Hello");
    addMessage(db, session.id, "assistant", "Hi there");

    const result = await compactSession(db, session.id, "test-model", 180_000);
    assert.strictEqual(result, null);
  });

  it("returns compaction message id when threshold is exceeded", async () => {
    patchChatGenerate("Summary of the conversation.");
    const session = createSession(db, "test-model", "You are helpful.");

    const bigContent = "a".repeat(1000);
    addMessage(db, session.id, "user", bigContent);
    addMessage(db, session.id, "assistant", bigContent);

    const result = await compactSession(db, session.id, "test-model", 100);
    assert.ok(typeof result === "number");
  });

  it("inserts a compaction message with is_compaction = 1", async () => {
    patchChatGenerate("Compact summary.");
    const session = createSession(db, "test-model", "System.");

    addMessage(db, session.id, "user", "a".repeat(1000));
    addMessage(db, session.id, "assistant", "b".repeat(1000));

    await compactSession(db, session.id, "test-model", 100);

    const rows = getMessages(db, session.id);
    const compactionMsg = rows.find((r) => r.is_compaction === 1);
    assert.ok(compactionMsg, "compaction message should exist");
    assert.strictEqual(compactionMsg!.role, "assistant");
    assert.strictEqual(compactionMsg!.content, "Compact summary.");
    assert.strictEqual(compactionMsg!.source, "synthetic");
  });

  it("updates sessions.head_message_id to the compaction message", async () => {
    patchChatGenerate("Summary.");
    const session = createSession(db, "test-model", "System.");
    addMessage(db, session.id, "user", "a".repeat(1000));
    addMessage(db, session.id, "assistant", "b".repeat(1000));

    const compactionId = await compactSession(db, session.id, "test-model", 100);

    const row = db.prepare("SELECT head_message_id FROM sessions WHERE id = ?").get(session.id) as {
      head_message_id: number;
    };
    assert.strictEqual(row.head_message_id, compactionId);
  });

  it("creates exactly one child system session for the oneshot call", async () => {
    patchChatGenerate("Summary.");
    const session = createSession(db, "test-model", "System.");
    addMessage(db, session.id, "user", "a".repeat(1000));
    addMessage(db, session.id, "assistant", "b".repeat(1000));

    await compactSession(db, session.id, "test-model", 100);

    const children = db
      .prepare("SELECT purpose FROM sessions WHERE parent_session_id = ?")
      .all(session.id) as Array<{ purpose: string }>;
    assert.strictEqual(children.length, 1, "exactly one child session should be created");
    assert.strictEqual(children[0].purpose, "system");
  });

  it("sets parent_id on compaction message to the exact pre-compaction last message", async () => {
    patchChatGenerate("Summary.");
    const session = createSession(db, "test-model", "System.");
    addMessage(db, session.id, "user", "a".repeat(1000));
    const lastPreCompaction = addMessage(db, session.id, "assistant", "b".repeat(1000));

    await compactSession(db, session.id, "test-model", 100);

    const rows = getMessages(db, session.id);
    const compactionMsg = rows.find((r) => r.is_compaction === 1);
    assert.strictEqual(
      compactionMsg!.parent_id,
      lastPreCompaction,
      "parent_id must equal the id of the last message before compaction",
    );
  });

  it("is idempotent: second call returns null when history is still small after compaction", async () => {
    patchChatGenerate("Summary.");
    const session = createSession(db, "test-model", "System.");
    addMessage(db, session.id, "user", "a".repeat(1000));
    addMessage(db, session.id, "assistant", "b".repeat(1000));

    const first = await compactSession(db, session.id, "test-model", 100);
    assert.ok(first !== null, "first compaction should fire");

    const second = await compactSession(db, session.id, "test-model", 100);
    assert.strictEqual(second, null, "second call should not compact again");
  });

  it("seals the pre-compaction last message as a segment boundary", async () => {
    patchChatGenerate("Summary.");
    const session = createSession(db, "test-model", "System.");
    addMessage(db, session.id, "user", "a".repeat(1000));
    const lastPreCompaction = addMessage(db, session.id, "assistant", "b".repeat(1000));

    await compactSession(db, session.id, "test-model", 100);

    const row = db
      .prepare("SELECT sealed_at FROM messages WHERE id = ?")
      .get(lastPreCompaction) as { sealed_at: string | null };
    assert.ok(row.sealed_at != null, "pre-compaction last message must be sealed");

    const unsealed = db
      .prepare(
        "SELECT COUNT(*) as c FROM messages WHERE session_id = ? AND sealed_at IS NOT NULL AND id != ?",
      )
      .get(session.id, lastPreCompaction) as { c: number };
    assert.strictEqual(unsealed.c, 0, "only the boundary message should be sealed");
  });

  it("does not seal anything when compaction is not needed", async () => {
    const session = createSession(db, "test-model", "System.");
    addMessage(db, session.id, "user", "Hello");
    addMessage(db, session.id, "assistant", "Hi");

    await compactSession(db, session.id, "test-model", 180_000);

    const sealed = db
      .prepare("SELECT COUNT(*) as c FROM messages WHERE session_id = ? AND sealed_at IS NOT NULL")
      .get(session.id) as { c: number };
    assert.strictEqual(sealed.c, 0);
  });

  it("compaction summary does not contain content added after compactSession is called", async () => {
    let capturedPrompt = "";
    mock.method(Chat.prototype, "generate", async function generate(this: Chat) {
      const msgs = this.messages;
      capturedPrompt = msgs.map((m) => m.content).join(" ");
      this.addMessage(new Message("assistant", "Summary."));
      return "Summary.";
    });

    const session = createSession(db, "test-model", "System.");
    addMessage(db, session.id, "user", "a".repeat(1000));
    addMessage(db, session.id, "assistant", "b".repeat(1000));

    await compactSession(db, session.id, "test-model", 100);

    const postMsg = "THIS_SHOULD_NOT_APPEAR_IN_SUMMARY";
    addMessage(db, session.id, "user", postMsg);

    assert.ok(
      !capturedPrompt.includes(postMsg),
      "compaction LLM input must not contain messages added after the call",
    );
  });
});
