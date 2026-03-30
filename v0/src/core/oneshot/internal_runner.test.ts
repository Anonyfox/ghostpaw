import assert from "node:assert";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { Chat, Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { getMessages } from "../chat/messages.ts";
import { getSession } from "../chat/session.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { runInternalOneshot } from "./internal_runner.ts";

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

describe("runInternalOneshot", () => {
  it("returns content from the LLM response", async () => {
    patchChatGenerate("Hello from the model");
    const result = await runInternalOneshot({
      db,
      model: "test-model",
      systemPrompt: "You are a test assistant.",
      userPrompt: "Say hello.",
    });
    assert.strictEqual(result.content, "Hello from the model");
  });

  it("creates a child session with system purpose by default", async () => {
    patchChatGenerate("ok");
    const result = await runInternalOneshot({
      db,
      model: "test-model",
      systemPrompt: "System.",
      userPrompt: "Prompt.",
    });
    const session = getSession(db, result.sessionId);
    assert.ok(session);
    assert.strictEqual(session.purpose, "system");
  });

  it("creates session with shade purpose when specified", async () => {
    patchChatGenerate("shade response");
    const result = await runInternalOneshot({
      db,
      model: "test-model",
      systemPrompt: "System.",
      userPrompt: "Prompt.",
      purpose: "shade",
    });
    const session = getSession(db, result.sessionId);
    assert.strictEqual(session!.purpose, "shade");
  });

  it("persists user and assistant messages", async () => {
    patchChatGenerate("assistant reply");
    const result = await runInternalOneshot({
      db,
      model: "test-model",
      systemPrompt: "System.",
      userPrompt: "User message here.",
    });
    const messages = getMessages(db, result.sessionId);
    assert.strictEqual(messages.length, 2);
    assert.strictEqual(messages[0].role, "user");
    assert.strictEqual(messages[0].content, "User message here.");
    assert.strictEqual(messages[1].role, "assistant");
    assert.strictEqual(messages[1].content, "assistant reply");
  });

  it("links to parent session when parentSessionId is provided", async () => {
    patchChatGenerate("linked response");
    const parent = db
      .prepare(
        "INSERT INTO sessions (model, system_prompt, purpose) VALUES ('m', 'p', 'chat') RETURNING *",
      )
      .get() as { id: number };

    const result = await runInternalOneshot({
      db,
      model: "test-model",
      systemPrompt: "System.",
      userPrompt: "With parent.",
      parentSessionId: parent.id,
    });

    const session = getSession(db, result.sessionId);
    assert.strictEqual(session!.parent_session_id, parent.id);
  });

  it("applies the title to the created session", async () => {
    patchChatGenerate("titled response");
    const result = await runInternalOneshot({
      db,
      model: "test-model",
      systemPrompt: "System.",
      userPrompt: "Titled.",
      title: "my-oneshot",
    });
    const session = getSession(db, result.sessionId);
    assert.strictEqual(session!.title, "my-oneshot");
  });

  it("returns zeroed usage when LLM provides no metadata", async () => {
    patchChatGenerate("bare response");
    const result = await runInternalOneshot({
      db,
      model: "test-model",
      systemPrompt: "System.",
      userPrompt: "Bare.",
    });
    assert.strictEqual(result.usage.inputTokens, 0);
    assert.strictEqual(result.usage.outputTokens, 0);
    assert.strictEqual(result.usage.costUsd, 0);
  });
});
