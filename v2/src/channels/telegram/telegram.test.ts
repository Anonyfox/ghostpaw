import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { Entity } from "../../harness/index.ts";
import type { TelegramChannelConfig } from "./types.ts";

describe("createTelegramChannel", () => {
  it("exports a factory function", async () => {
    const mod = await import("./telegram.ts");
    strictEqual(typeof mod.createTelegramChannel, "function");
  });

  it("returns a channel with the expected interface", async () => {
    const { createTelegramChannel } = await import("./telegram.ts");

    const mockBot = {
      catch: () => {},
      command: () => {},
      on: () => {},
      start: async () => {},
      stop: async () => {},
      api: {},
    };

    const config: TelegramChannelConfig = {
      token: "fake:token",
      db: {} as never,
      entity: {
        db: {} as never,
        workspace: "/tmp",
        async executeTurn() {
          return {
            succeeded: true,
            messageId: 1,
            content: "ok",
            model: "test",
            usage: {
              inputTokens: 0,
              outputTokens: 0,
              reasoningTokens: 0,
              cachedTokens: 0,
              totalTokens: 0,
            },
            cost: { estimatedUsd: 0 },
            iterations: 0,
          };
        },
        streamTurn: (() => {
          throw new Error("unused");
        }) as Entity["streamTurn"],
        async flush() {},
      },
      bot: mockBot as never,
      sendMessage: async () => {},
      sendTyping: async () => {},
      setReaction: async () => {},
    };

    const channel = createTelegramChannel(config);
    strictEqual(channel.name, "telegram");
    ok(typeof channel.start === "function");
    ok(typeof channel.stop === "function");
  });
});
