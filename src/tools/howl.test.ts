import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { listHowls } from "../core/chat/api/read/howls/index.ts";
import { createSession } from "../core/chat/api/write/index.ts";
import { initChatTables, initHowlTables } from "../core/chat/runtime/index.ts";
import { setConfig } from "../core/config/api/write/index.ts";
import { initConfigTable } from "../core/config/runtime/index.ts";
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
    isConnected: () => connected,
    getHowlCapabilities: () => ({
      canPush: type === "telegram",
      canInbox: type === "web",
      explicitReply: true,
      priority: type === "telegram" ? 100 : 50,
    }),
    deliverHowl: async ({ message }) => {
      sent.push(message);
      return {
        channel: type,
        delivered: type === "telegram",
        mode: type === "telegram" ? "push" : "inbox",
        address: type === "telegram" ? "123" : "web",
        messageId: type === "telegram" ? "456" : null,
      };
    },
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
    ok(result.sessionId);
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
    strictEqual(result.mode, "push");
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
