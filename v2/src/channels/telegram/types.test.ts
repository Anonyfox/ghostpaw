import { ok } from "node:assert";
import { describe, it } from "node:test";
import type { TelegramChannel, TelegramChannelConfig } from "./types.ts";

describe("TelegramChannelConfig", () => {
  it("is satisfiable with required fields", () => {
    const config: TelegramChannelConfig = {
      token: "fake",
      db: {} as never,
      entity: {} as never,
    };
    ok(config.token);
  });

  it("accepts optional overrides", () => {
    const config: TelegramChannelConfig = {
      token: "fake",
      db: {} as never,
      entity: {} as never,
      allowedChatIds: [123, -456],
      bot: {} as never,
      sendMessage: async () => ({ messageId: 1 }),
      sendTyping: async () => {},
      setReaction: async () => {},
    };
    ok(config.allowedChatIds);
    ok(config.bot);
  });
});

describe("TelegramChannel", () => {
  it("has the expected shape", () => {
    const channel: TelegramChannel = {
      name: "telegram",
      start: async () => ({ username: "test" }),
      stop: async () => {},
    };
    ok(channel.name === "telegram");
    ok(typeof channel.start === "function");
    ok(typeof channel.stop === "function");
  });
});
