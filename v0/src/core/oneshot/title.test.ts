import assert from "node:assert";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { Chat, Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { addMessage } from "../chat/messages.ts";
import { createSession, getSession } from "../chat/session.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { createOneshotRegistry } from "./registry.ts";
import type { OneshotRunOpts } from "./types.ts";

function patchChatGenerate(title: string): void {
  mock.method(Chat.prototype, "generate", async function generate(this: Chat) {
    this.addMessage(new Message("assistant", title));
    return title;
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

describe("title oneshot", () => {
  it("registers under the name 'generate-title'", async () => {
    const { registerTitleOneshot } = await import("./title.ts");
    const reg = createOneshotRegistry();
    registerTitleOneshot(reg);
    assert.ok(reg.get("generate-title"));
  });

  it("shouldFire returns true for untitled session with one message", async () => {
    const { registerTitleOneshot } = await import("./title.ts");
    const reg = createOneshotRegistry();
    registerTitleOneshot(reg);
    const def = reg.get("generate-title")!;

    const session = createSession(db, "m", "p");
    addMessage(db, session.id, "user", "Hello world");

    const opts: OneshotRunOpts = {
      db,
      sessionId: session.id,
      triggerMessageId: 1,
      userContent: "Hello world",
      model: "test-model",
      timeoutMs: 5_000,
    };

    assert.strictEqual(def.shouldFire(opts), true);
  });

  it("shouldFire returns false when session already has a title", async () => {
    const { registerTitleOneshot } = await import("./title.ts");
    const reg = createOneshotRegistry();
    registerTitleOneshot(reg);
    const def = reg.get("generate-title")!;

    const session = createSession(db, "m", "p");
    addMessage(db, session.id, "user", "Hello");
    db.prepare("UPDATE sessions SET title = ? WHERE id = ?").run("Existing", session.id);

    const opts: OneshotRunOpts = {
      db,
      sessionId: session.id,
      triggerMessageId: 1,
      userContent: "Hello",
      model: "test-model",
      timeoutMs: 5_000,
    };

    assert.strictEqual(def.shouldFire(opts), false);
  });

  it("shouldFire returns false when session has more than one message", async () => {
    const { registerTitleOneshot } = await import("./title.ts");
    const reg = createOneshotRegistry();
    registerTitleOneshot(reg);
    const def = reg.get("generate-title")!;

    const session = createSession(db, "m", "p");
    addMessage(db, session.id, "user", "Hello");
    addMessage(db, session.id, "assistant", "Hi there");

    const opts: OneshotRunOpts = {
      db,
      sessionId: session.id,
      triggerMessageId: 1,
      userContent: "Hello",
      model: "test-model",
      timeoutMs: 5_000,
    };

    assert.strictEqual(def.shouldFire(opts), false);
  });

  it("execute sets the parent session title", async () => {
    patchChatGenerate("Chat About Greetings");
    const { registerTitleOneshot } = await import("./title.ts");
    const reg = createOneshotRegistry();
    registerTitleOneshot(reg);
    const def = reg.get("generate-title")!;

    const session = createSession(db, "m", "p");
    addMessage(db, session.id, "user", "Hello world");

    const opts: OneshotRunOpts = {
      db,
      sessionId: session.id,
      triggerMessageId: 1,
      userContent: "Hello world",
      model: "test-model",
      timeoutMs: 5_000,
    };

    await def.execute(opts);

    const updated = getSession(db, session.id);
    assert.strictEqual(updated!.title, "Chat About Greetings");
  });

  it("execute creates a system session linked to parent", async () => {
    patchChatGenerate("Test Title");
    const { registerTitleOneshot } = await import("./title.ts");
    const reg = createOneshotRegistry();
    registerTitleOneshot(reg);
    const def = reg.get("generate-title")!;

    const session = createSession(db, "m", "p");
    const msgId = addMessage(db, session.id, "user", "Hello");

    const opts: OneshotRunOpts = {
      db,
      sessionId: session.id,
      triggerMessageId: msgId,
      userContent: "Hello",
      model: "test-model",
      timeoutMs: 5_000,
    };

    await def.execute(opts);

    const children = db
      .prepare("SELECT * FROM sessions WHERE parent_session_id = ?")
      .all(session.id) as unknown as {
      purpose: string;
      title: string;
      triggered_by_message_id: number;
    }[];

    assert.strictEqual(children.length, 1);
    assert.strictEqual(children[0].purpose, "system");
    assert.ok(children[0].title!.startsWith("generate-title:"));
    assert.strictEqual(children[0].triggered_by_message_id, msgId);
  });

  it("execute strips surrounding quotes from LLM output", async () => {
    patchChatGenerate('"Quoted Title"');
    const { registerTitleOneshot } = await import("./title.ts");
    const reg = createOneshotRegistry();
    registerTitleOneshot(reg);
    const def = reg.get("generate-title")!;

    const session = createSession(db, "m", "p");
    addMessage(db, session.id, "user", "Hello");

    await def.execute({
      db,
      sessionId: session.id,
      triggerMessageId: 1,
      userContent: "Hello",
      model: "test-model",
      timeoutMs: 5_000,
    });

    const updated = getSession(db, session.id);
    assert.strictEqual(updated!.title, "Quoted Title");
  });
});
