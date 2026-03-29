import assert from "node:assert";
import { describe, it } from "node:test";
import { openMemoryDatabase } from "../db/open.ts";
import { openMemoryAffinityDatabase } from "../db/open_affinity.ts";

describe("innkeeper subagent module", () => {
  it("can import runAffinitySubagent", async () => {
    const { runAffinitySubagent } = await import("./subagent.ts");
    assert.strictEqual(typeof runAffinitySubagent, "function");
  });

  it("builds a system prompt with affinity soul foundation", async () => {
    const { soul } = await import("@ghostpaw/affinity");
    const soulPrompt = soul.renderAffinitySoulPromptFoundation();
    assert.strictEqual(typeof soulPrompt, "string");
    assert.ok(soulPrompt.length > 100);
  });

  it("child session is created with subsystem_turn purpose", async () => {
    const chatDb = openMemoryDatabase();
    const affinityDb = openMemoryAffinityDatabase();
    const { createSession } = await import("../chat/session.ts");

    const session = createSession(chatDb, "m", "p", {
      purpose: "subsystem_turn",
      parentSessionId: 1,
      triggeredByMessageId: 42,
    });

    assert.strictEqual(session.purpose, "subsystem_turn");
    assert.strictEqual(session.parent_session_id, 1);
    assert.strictEqual(session.triggered_by_message_id, 42);

    chatDb.close();
    affinityDb.close();
  });
});
