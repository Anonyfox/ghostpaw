import assert from "node:assert";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { Chat, Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import type { SoulIds } from "../../runtime.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { openMemorySoulsDatabase } from "../db/open_souls.ts";
import { bootstrapSouls } from "../souls/bootstrap.ts";
import { createAskMentorTool } from "./ask_mentor_tool.ts";

const TEST_CTX = { model: "test-model", provider: "test" };

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

describe("createAskMentorTool", () => {
  it("delegates to the mentor and returns the response", async () => {
    patchChatStream("Soul health is good. No changes needed.");

    const tool = createAskMentorTool({
      db,
      soulsDb,
      mentorSoulId: soulIds.mentor,
      modelSmall: "test-model-small",
      timeoutMs: 60_000,
    });

    const result = await tool.executeCall(
      { id: "call-1", name: "ask_mentor", args: { task: "Review soul health for ghostpaw" } },
      TEST_CTX,
    );

    assert.strictEqual(result.success, true);
    const data = result.result as { ok: boolean; response: string; sessionId: number };
    assert.strictEqual(data.ok, true);
    assert.ok(data.response.includes("Soul health is good"));
    assert.strictEqual(typeof data.sessionId, "number");
  });

  it("creates a session with soul_id set to mentor", async () => {
    patchChatStream("Reviewed.");

    const tool = createAskMentorTool({
      db,
      soulsDb,
      mentorSoulId: soulIds.mentor,
      modelSmall: "test-model-small",
      timeoutMs: 60_000,
    });

    const result = await tool.executeCall(
      { id: "call-2", name: "ask_mentor", args: { task: "Create a new specialist soul" } },
      TEST_CTX,
    );

    const data = result.result as { sessionId: number };
    const session = db
      .prepare("SELECT purpose, soul_id FROM sessions WHERE id = ?")
      .get(data.sessionId) as { purpose: string; soul_id: number };

    assert.strictEqual(session.purpose, "delegate");
    assert.strictEqual(session.soul_id, soulIds.mentor);
  });

  it("returns error info when the LLM turn fails", async () => {
    mock.method(Chat.prototype, "stream", async function* stream(this: Chat) {
      yield "";
      throw new Error("LLM unavailable");
    });

    const tool = createAskMentorTool({
      db,
      soulsDb,
      mentorSoulId: soulIds.mentor,
      modelSmall: "test-model-small",
      timeoutMs: 60_000,
    });

    const result = await tool.executeCall(
      { id: "call-3", name: "ask_mentor", args: { task: "Review soul health" } },
      TEST_CTX,
    );

    assert.strictEqual(result.success, true);
    const data = result.result as { ok: boolean; error: string };
    assert.strictEqual(data.ok, false);
    assert.ok(data.error.includes("LLM unavailable"));
  });

  it("has a description mentioning soul management", () => {
    const tool = createAskMentorTool({
      db,
      soulsDb,
      mentorSoulId: soulIds.mentor,
      modelSmall: "test-model-small",
      timeoutMs: 60_000,
    });

    assert.ok(tool.description.includes("Mentor"));
    assert.ok(tool.description.includes("soul"));
  });
});
