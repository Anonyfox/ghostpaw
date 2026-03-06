import { ok, strictEqual } from "node:assert";
import { afterEach, describe, it } from "node:test";
import {
  clearChannelRegistry,
  getBestChannel,
  getChannel,
  getConnectedChannels,
  registerChannel,
  unregisterChannel,
} from "./channel_registry.ts";
import type { ChannelHandle } from "./channel_registry.ts";

function makeHandle(type: ChannelHandle["type"], connected = true): ChannelHandle {
  return {
    type,
    send: async () => {},
    isConnected: () => connected,
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

  it("getBestChannel prefers telegram", () => {
    registerChannel("web1", makeHandle("web"));
    registerChannel("tg", makeHandle("telegram"));
    const best = getBestChannel();
    ok(best);
    strictEqual(best.type, "telegram");
  });

  it("getBestChannel falls back to web", () => {
    registerChannel("web1", makeHandle("web"));
    const best = getBestChannel();
    ok(best);
    strictEqual(best.type, "web");
  });

  it("getBestChannel returns null when nothing connected", () => {
    registerChannel("tg", makeHandle("telegram", false));
    strictEqual(getBestChannel(), null);
  });

  it("getBestChannel returns null when registry empty", () => {
    strictEqual(getBestChannel(), null);
  });
});
