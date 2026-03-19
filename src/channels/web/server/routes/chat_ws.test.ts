import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { chatWsConnections, handleChatWs } from "./chat_ws.ts";

function mockWs() {
  const handlers: Record<string, Array<(data: string) => void>> = {};
  const sent: string[] = [];
  return {
    send(data: string) {
      sent.push(data);
    },
    close() {},
    on(event: string, handler: (data: string) => void) {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    },
    emit(event: string, data?: string) {
      for (const h of handlers[event] ?? []) h(data!);
    },
    sent,
  };
}

describe("handleChatWs", () => {
  it("is a function", () => {
    ok(typeof handleChatWs === "function");
  });

  it("registers connection on setup", () => {
    const ws = mockWs();
    const entity = {} as never;
    handleChatWs(42, ws, entity);
    ok(chatWsConnections.get(42) === ws);
    chatWsConnections.remove(42);
  });

  it("removes connection on close", () => {
    const ws = mockWs();
    const entity = {} as never;
    handleChatWs(43, ws, entity);
    ok(chatWsConnections.get(43) === ws);
    ws.emit("close");
    strictEqual(chatWsConnections.get(43), undefined);
  });

  it("sends error for invalid JSON", () => {
    const ws = mockWs();
    const entity = {} as never;
    handleChatWs(44, ws, entity);
    ws.emit("message", "not json");
    strictEqual(ws.sent.length, 1);
    const msg = JSON.parse(ws.sent[0]);
    strictEqual(msg.type, "error");
    ok(msg.message.includes("Invalid JSON"));
    chatWsConnections.remove(44);
  });

  it("sends error for empty content", () => {
    const ws = mockWs();
    const entity = {} as never;
    handleChatWs(45, ws, entity);
    ws.emit("message", JSON.stringify({ type: "send", content: "" }));
    strictEqual(ws.sent.length, 1);
    const msg = JSON.parse(ws.sent[0]);
    strictEqual(msg.type, "error");
    ok(msg.message.includes("Empty"));
    chatWsConnections.remove(45);
  });
});

describe("chatWsConnections", () => {
  it("tracks connections", () => {
    const ws = mockWs();
    chatWsConnections.set(100, ws);
    strictEqual(chatWsConnections.get(100), ws);
    strictEqual(chatWsConnections.count(), 1);
    chatWsConnections.remove(100);
    strictEqual(chatWsConnections.get(100), undefined);
    strictEqual(chatWsConnections.count(), 0);
  });
});
