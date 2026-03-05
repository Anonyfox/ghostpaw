import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { sendNotification } from "./notify.ts";

describe("sendNotification", () => {
  it("sends text via the send override", async () => {
    const sent: Array<{ chatId: number; text: string }> = [];
    await sendNotification({
      token: "fake",
      chatId: 42,
      text: "wake up",
      send: async (chatId, text) => {
        sent.push({ chatId, text });
      },
    });
    strictEqual(sent.length, 1);
    strictEqual(sent[0]!.chatId, 42);
    strictEqual(sent[0]!.text, "wake up");
  });

  it("splits long messages", async () => {
    const sent: string[] = [];
    await sendNotification({
      token: "fake",
      chatId: 1,
      text: "x".repeat(5000),
      send: async (_chatId, text) => {
        sent.push(text);
      },
    });
    ok(sent.length >= 2, `expected >=2 parts, got ${sent.length}`);
    for (const part of sent) {
      ok(part.length <= 4096);
    }
  });

  it("exports sendNotification function", async () => {
    const mod = await import("./notify.ts");
    strictEqual(typeof mod.sendNotification, "function");
  });
});
