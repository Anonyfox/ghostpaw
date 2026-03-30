import assert from "node:assert";
import { describe, it } from "node:test";
import { openMemoryDatabase } from "../db/open.ts";
import { openMemorySoulsDatabase } from "../db/open_souls.ts";
import { bootstrapSouls } from "../souls/bootstrap.ts";
import { renderSoul } from "../souls/render.ts";

describe("scribe subagent module", () => {
  it("can import runCodexSubagent", async () => {
    const { runCodexSubagent } = await import("./subagent.ts");
    assert.strictEqual(typeof runCodexSubagent, "function");
  });

  it("runCodexSubagent accepts soulsDb and scribeId as parameters", async () => {
    const { runCodexSubagent } = await import("./subagent.ts");
    assert.strictEqual(runCodexSubagent.length, 3, "should take opts, soulsDb, scribeId");
  });

  it("renders a non-empty soul prompt for scribe ID", () => {
    const soulsDb = openMemorySoulsDatabase();
    const ids = bootstrapSouls(soulsDb);
    const rendered = renderSoul(soulsDb, ids.scribe);
    assert.ok(rendered.length > 100, "scribe soul should render to substantial text");
    assert.ok(rendered.includes("Scribe"), "rendered soul should mention Scribe");
    soulsDb.close();
  });

  it("child session is created with subsystem_turn purpose", async () => {
    const chatDb = openMemoryDatabase();
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
  });
});
