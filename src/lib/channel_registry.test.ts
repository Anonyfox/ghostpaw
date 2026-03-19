import { ok, strictEqual } from "node:assert";
import { afterEach, describe, it } from "node:test";
import type { ChannelHandle } from "./channel_registry.ts";
import {
  clearChannelRegistry,
  getChannel,
  getConnectedChannels,
  registerChannel,
  selectHowlChannel,
  unregisterChannel,
} from "./channel_registry.ts";

function makeHandle(
  type: ChannelHandle["type"],
  connected = true,
  overrides?: Partial<ReturnType<ChannelHandle["getHowlCapabilities"]>>,
): ChannelHandle {
  return {
    type,
    isConnected: () => connected,
    getHowlCapabilities: () => ({
      canPush: type === "telegram",
      canInbox: type === "web",
      explicitReply: true,
      priority: type === "telegram" ? 100 : 50,
      ...overrides,
    }),
    deliverHowl: async () => ({
      channel: type,
      delivered: type === "telegram",
      mode: type === "telegram" ? "push" : "inbox",
      address: null,
      messageId: null,
    }),
  };
}

afterEach(() => {
  clearChannelRegistry();
});

describe("channel registry", () => {
  it("registers and retrieves a channel", () => {
    registerChannel("tg", makeHandle("telegram"));
    ok(getChannel("tg"));
    strictEqual(getChannel("tg")?.type, "telegram");
  });

  it("unregisters a channel", () => {
    registerChannel("tg", makeHandle("telegram"));
    unregisterChannel("tg");
    strictEqual(getChannel("tg"), null);
  });

  it("returns only connected channels", () => {
    registerChannel("tg", makeHandle("telegram", true));
    registerChannel("web", makeHandle("web", false));
    const connected = getConnectedChannels();
    strictEqual(connected.length, 1);
    strictEqual(connected[0].type, "telegram");
  });

  it("selectHowlChannel prefers telegram for high urgency", () => {
    registerChannel("web1", makeHandle("web"));
    registerChannel("tg", makeHandle("telegram"));
    const best = selectHowlChannel("high");
    ok(best);
    strictEqual(best.type, "telegram");
  });

  it("selectHowlChannel prefers inbox surfaces for low urgency", () => {
    registerChannel("web1", makeHandle("web"));
    registerChannel("tg", makeHandle("telegram"));
    const best = selectHowlChannel("low");
    ok(best);
    strictEqual(best.type, "web");
  });

  it("selectHowlChannel falls back to push when no inbox surface exists", () => {
    registerChannel("tg", makeHandle("telegram"));
    const best = selectHowlChannel("low");
    ok(best);
    strictEqual(best.type, "telegram");
  });

  it("selectHowlChannel returns null when nothing can deliver high urgency", () => {
    registerChannel("web1", makeHandle("web"));
    strictEqual(selectHowlChannel("high"), null);
  });

  it("selectHowlChannel returns null when nothing connected", () => {
    registerChannel("tg", makeHandle("telegram", false));
    strictEqual(selectHowlChannel("high"), null);
  });

  it("selectHowlChannel returns null when registry empty", () => {
    strictEqual(selectHowlChannel("low"), null);
  });
});
