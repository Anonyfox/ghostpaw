import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { createEventBus, type AgentEventMap } from "./events.js";

describe("EventBus - on/emit", () => {
  it("fires handler when event is emitted", () => {
    const bus = createEventBus();
    const received: AgentEventMap["run:start"][] = [];
    bus.on("run:start", (data) => received.push(data));

    const payload = { runId: "r1", sessionId: "s1", agent: "default", prompt: "hi" };
    bus.emit("run:start", payload);

    strictEqual(received.length, 1);
    deepStrictEqual(received[0], payload);
  });

  it("fires multiple handlers for the same event", () => {
    const bus = createEventBus();
    let count = 0;
    bus.on("run:end", () => count++);
    bus.on("run:end", () => count++);

    bus.emit("run:end", { runId: "r1", sessionId: "s1", text: "done" });
    strictEqual(count, 2);
  });

  it("does not fire handlers for different events", () => {
    const bus = createEventBus();
    let called = false;
    bus.on("run:start", () => {
      called = true;
    });

    bus.emit("run:end", { runId: "r1", sessionId: "s1", text: null });
    strictEqual(called, false);
  });

  it("emitting with no handlers is a no-op", () => {
    const bus = createEventBus();
    bus.emit("run:start", { runId: "r1", sessionId: "s1", agent: "default", prompt: "hi" });
  });
});

describe("EventBus - off", () => {
  it("removes a handler so it stops firing", () => {
    const bus = createEventBus();
    let count = 0;
    const handler = () => count++;

    bus.on("run:end", handler);
    bus.emit("run:end", { runId: "r1", sessionId: "s1", text: "" });
    strictEqual(count, 1);

    bus.off("run:end", handler);
    bus.emit("run:end", { runId: "r2", sessionId: "s1", text: "" });
    strictEqual(count, 1);
  });

  it("off for non-registered handler is a no-op", () => {
    const bus = createEventBus();
    bus.off("run:start", () => {});
  });
});

describe("EventBus - fail-open", () => {
  it("continues firing other handlers when one throws", () => {
    const bus = createEventBus();
    const received: string[] = [];

    bus.on("run:end", () => {
      throw new Error("handler exploded");
    });
    bus.on("run:end", () => {
      received.push("second handler ran");
    });

    bus.emit("run:end", { runId: "r1", sessionId: "s1", text: "" });
    strictEqual(received.length, 1);
    ok(received[0]!.includes("second handler"));
  });
});

describe("EventBus - event types", () => {
  it("supports all defined event types", () => {
    const bus = createEventBus();
    const events: string[] = [];

    bus.on("run:start", () => events.push("run:start"));
    bus.on("run:end", () => events.push("run:end"));
    bus.on("run:error", () => events.push("run:error"));
    bus.on("stream:chunk", () => events.push("stream:chunk"));
    bus.on("delegate:spawn", () => events.push("delegate:spawn"));
    bus.on("delegate:done", () => events.push("delegate:done"));

    bus.emit("run:start", { runId: "r", sessionId: "s", agent: "a", prompt: "p" });
    bus.emit("run:end", { runId: "r", sessionId: "s", text: "t" });
    bus.emit("run:error", { runId: "r", sessionId: "s", error: "e" });
    bus.emit("stream:chunk", { sessionId: "s", chunk: "c" });
    bus.emit("delegate:spawn", { parentSessionId: "s", childRunId: "cr", agent: "a" });
    bus.emit("delegate:done", { childRunId: "cr", status: "completed", result: "r" });

    strictEqual(events.length, 6);
  });
});
