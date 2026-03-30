import assert from "node:assert";
import { describe, it } from "node:test";
import { Message } from "chatoyant";
import { shouldCompact } from "./should_compact.ts";

function makeHistory(roles: Array<{ role: "user" | "assistant" | "tool"; content: string }>) {
  return roles.map((r) => new Message(r.role, r.content));
}

describe("shouldCompact", () => {
  it("returns false when threshold is 0", () => {
    const history = makeHistory([{ role: "user", content: "a".repeat(100) }]);
    assert.strictEqual(shouldCompact(history, 0), false);
  });

  it("returns false for empty history", () => {
    assert.strictEqual(shouldCompact([], 100), false);
  });

  it("returns false when under threshold", () => {
    const history = makeHistory([{ role: "user", content: "hello" }]);
    assert.strictEqual(shouldCompact(history, 100), false);
  });

  it("returns true when over threshold", () => {
    const history = makeHistory([
      { role: "user", content: "a".repeat(800) },
      { role: "assistant", content: "b".repeat(800) },
    ]);
    assert.strictEqual(shouldCompact(history, 100), true);
  });

  it("ignores tool messages for token counting", () => {
    const history = makeHistory([{ role: "tool", content: "a".repeat(10000) }]);
    assert.strictEqual(shouldCompact(history, 100), false);
  });

  it("sums user and assistant content", () => {
    const history = makeHistory([
      { role: "user", content: "a".repeat(400) },
      { role: "assistant", content: "b".repeat(400) },
    ]);
    assert.strictEqual(shouldCompact(history, 100), true);
  });

  it("returns false when tokens exactly equal threshold", () => {
    const history = makeHistory([{ role: "user", content: "a".repeat(400) }]);
    assert.strictEqual(shouldCompact(history, 100), false);
  });

  it("returns true when one token over threshold", () => {
    const history = makeHistory([{ role: "user", content: "a".repeat(404) }]);
    assert.strictEqual(shouldCompact(history, 100), true);
  });

  it("returns false for negative threshold", () => {
    const history = makeHistory([{ role: "user", content: "a".repeat(1000) }]);
    assert.strictEqual(shouldCompact(history, -1), false);
  });

  it("handles messages with empty content", () => {
    const history = makeHistory([
      { role: "user", content: "" },
      { role: "assistant", content: "" },
    ]);
    assert.strictEqual(shouldCompact(history, 100), false);
  });
});
