import assert from "node:assert";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { type SoulsDb, write } from "@ghostpaw/souls";
import { Chat, Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import type { SoulIds } from "../../runtime.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { openMemorySoulsDatabase } from "../db/open_souls.ts";
import { bootstrapSouls } from "../souls/bootstrap.ts";
import { createDelegateTool } from "./delegate_tool.ts";

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
let internalSoulIds: Set<number>;

beforeEach(() => {
  db = openMemoryDatabase();
  soulsDb = openMemorySoulsDatabase();
  soulIds = bootstrapSouls(soulsDb);
  internalSoulIds = new Set(Object.values(soulIds));
});

afterEach(() => {
  soulsDb.close();
  db.close();
  mock.restoreAll();
});

function createCustomSoul(): number {
  const soul = write.createSoul(soulsDb as unknown as SoulsDb, {
    name: "Test Specialist",
    description: "A test specialist for delegation",
    essence: "You are a test specialist.",
  });
  return soul.id;
}

describe("createDelegateTool", () => {
  it("rejects delegation to internal soul IDs", async () => {
    const tool = createDelegateTool({
      db,
      soulsDb,
      workspace: "/tmp/test",
      model: "test-model",
      internalSoulIds,
      timeoutMs: 60_000,
    });

    const result = await tool.executeCall(
      { id: "call-1", name: "delegate", args: { soul_id: soulIds.ghostpaw, task: "hello" } },
      TEST_CTX,
    );

    assert.strictEqual(result.success, true);
    const data = result.result as { error: string };
    assert.ok(data.error.includes("internal soul"));
  });

  it("rejects delegation to nonexistent soul ID", async () => {
    const tool = createDelegateTool({
      db,
      soulsDb,
      workspace: "/tmp/test",
      model: "test-model",
      internalSoulIds,
      timeoutMs: 60_000,
    });

    const result = await tool.executeCall(
      { id: "call-2", name: "delegate", args: { soul_id: 99999, task: "hello" } },
      TEST_CTX,
    );

    assert.strictEqual(result.success, true);
    const data = result.result as { error: string };
    assert.ok(data.error.includes("No soul found"));
  });

  it("rejects delegation to a dormant soul", async () => {
    const soulId = createCustomSoul();
    write.retireSoul(soulsDb as unknown as SoulsDb, soulId);

    const tool = createDelegateTool({
      db,
      soulsDb,
      workspace: "/tmp/test",
      model: "test-model",
      internalSoulIds,
      timeoutMs: 60_000,
    });

    const result = await tool.executeCall(
      { id: "call-3", name: "delegate", args: { soul_id: soulId, task: "hello" } },
      TEST_CTX,
    );

    assert.strictEqual(result.success, true);
    const data = result.result as { error: string };
    assert.ok(data.error.includes("retired"));
  });

  it("delegates successfully to a custom soul", async () => {
    patchChatStream("Custom soul response.");
    const soulId = createCustomSoul();

    const tool = createDelegateTool({
      db,
      soulsDb,
      workspace: "/tmp/test",
      model: "test-model",
      internalSoulIds,
      timeoutMs: 60_000,
    });

    const result = await tool.executeCall(
      { id: "call-4", name: "delegate", args: { soul_id: soulId, task: "build something" } },
      TEST_CTX,
    );

    assert.strictEqual(result.success, true);
    const data = result.result as { ok: boolean; response: string; soulId: number };
    assert.strictEqual(data.ok, true);
    assert.strictEqual(data.response, "Custom soul response.");
    assert.strictEqual(data.soulId, soulId);
  });

  it("includes custom souls in the tool description", () => {
    const soulId = createCustomSoul();

    const tool = createDelegateTool({
      db,
      soulsDb,
      workspace: "/tmp/test",
      model: "test-model",
      internalSoulIds,
      timeoutMs: 60_000,
    });

    assert.ok(tool.description.includes(`id=${soulId}`));
    assert.ok(tool.description.includes("Test Specialist"));
  });

  it("excludes internal souls from the tool description", () => {
    const tool = createDelegateTool({
      db,
      soulsDb,
      workspace: "/tmp/test",
      model: "test-model",
      internalSoulIds,
      timeoutMs: 60_000,
    });

    assert.ok(!tool.description.includes("Ghostpaw"));
    assert.ok(!tool.description.includes("Mentor"));
  });
});
