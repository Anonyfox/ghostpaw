import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createSession, initChatTables } from "../core/chat/index.ts";
import { setConfig } from "../core/config/api/write/index.ts";
import { initConfigTable } from "../core/config/runtime/index.ts";
import { initHowlTables, listHowls } from "../core/howl/index.ts";
import type { ChannelHandle } from "../lib/channel_registry.ts";
import { clearChannelRegistry, registerChannel } from "../lib/channel_registry.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/index.ts";
import { createHowlTool } from "./howl.ts";

let db: DatabaseHandle;
let currentSessionId: number | null;
let headMessageId: number | null;
let execute: (args: Record<string, unknown>) => Promise<unknown>;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initConfigTable(db);
  initHowlTables(db);
  clearChannelRegistry();

  const session = createSession(db, "chat:origin");
  currentSessionId = session.id as number;
  headMessageId = null;

  const tool = createHowlTool({
    db,
    getCurrentSessionId: () => currentSessionId,
    getHeadMessageId: () => headMessageId,
  });
  execute = (args) => tool.execute({ args } as never);
});

afterEach(() => {
  db.close();
  clearChannelRegistry();
});

function makeMockChannel(
  type: ChannelHandle["type"],
  connected = true,
): ChannelHandle & { sent: string[] } {
  const sent: string[] = [];
  return {
    type,
    send: async (msg: string) => {
      sent.push(msg);
    },
    isConnected: () => connected,
    sent,
  };
}

describe("howl tool", () => {
  it("creates a howl with origin tracking", async () => {
    const result = (await execute({
      message: "Is this config valid?",
      urgency: "low",
    })) as Record<string, unknown>;

    ok(result.howlId);
    strictEqual(result.channel, "stored");

    const howls = listHowls(db);
    strictEqual(howls.length, 1);
    strictEqual(howls[0].message, "Is this config valid?");
    strictEqual(howls[0].urgency, "low");
  });

  it("delivers high urgency to connected channel", async () => {
    const tg = makeMockChannel("telegram");
    registerChannel("tg", tg);

    const result = (await execute({
      message: "Critical finding!",
      urgency: "high",
    })) as Record<string, unknown>;

    strictEqual(result.delivered, true);
    strictEqual(result.channel, "telegram");
    strictEqual(tg.sent.length, 1);
    strictEqual(tg.sent[0], "Critical finding!");
  });

  it("enforces daily limit", async () => {
    setConfig(db, "max_howls_per_day", 1, "cli");

    await execute({ message: "first", urgency: "low" });

    const result = (await execute({
      message: "second",
      urgency: "low",
    })) as Record<string, unknown>;

    ok(result.error);
    ok(String(result.error).includes("Daily howl limit"));
  });

  it("enforces cooldown for low urgency", async () => {
    setConfig(db, "howl_cooldown_minutes", 999, "cli");

    await execute({ message: "first", urgency: "low" });

    const result = (await execute({
      message: "second",
      urgency: "low",
    })) as Record<string, unknown>;

    ok(result.error);
    ok(String(result.error).includes("Cooldown active"));
  });

  it("high urgency bypasses cooldown", async () => {
    setConfig(db, "howl_cooldown_minutes", 999, "cli");

    await execute({ message: "first", urgency: "low" });

    const result = (await execute({
      message: "urgent",
      urgency: "high",
    })) as Record<string, unknown>;

    ok(!result.error);
    ok(result.howlId);
  });

  it("defaults urgency to low", async () => {
    const result = (await execute({
      message: "no urgency specified",
    })) as Record<string, unknown>;

    ok(result.howlId);
    const howls = listHowls(db);
    strictEqual(howls[0].urgency, "low");
  });

  it("returns error when no active session", async () => {
    currentSessionId = null;
    const result = (await execute({
      message: "orphan howl",
      urgency: "low",
    })) as Record<string, unknown>;

    ok(result.error);
    ok(String(result.error).includes("Cannot howl outside"));
  });
});
