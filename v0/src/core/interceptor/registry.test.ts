import assert from "node:assert";
import { describe, it } from "node:test";
import { createSubsystemRegistry } from "./registry.ts";

const stubRun = async () => ({ sessionId: 0, summary: "", succeeded: false });

describe("createSubsystemRegistry", () => {
  it("starts empty", () => {
    const registry = createSubsystemRegistry();
    assert.strictEqual(registry.names().length, 0);
    assert.strictEqual(registry.list().length, 0);
  });

  it("registers and retrieves a subsystem", () => {
    const registry = createSubsystemRegistry();
    registry.register({
      name: "test",
      defaultLookback: 3,
      defaultTimeoutMs: 5000,
      run: stubRun,
    });

    assert.deepStrictEqual(registry.names(), ["test"]);
    assert.strictEqual(registry.list().length, 1);

    const def = registry.get("test");
    assert.ok(def);
    assert.strictEqual(def.name, "test");
    assert.strictEqual(def.defaultLookback, 3);
    assert.strictEqual(def.defaultTimeoutMs, 5000);
    assert.strictEqual(typeof def.run, "function");
  });

  it("returns undefined for unknown subsystem", () => {
    const registry = createSubsystemRegistry();
    assert.strictEqual(registry.get("nope"), undefined);
  });

  it("supports multiple registrations", () => {
    const registry = createSubsystemRegistry();
    registry.register({
      name: "a",
      defaultLookback: 1,
      defaultTimeoutMs: 1000,
      run: stubRun,
    });
    registry.register({
      name: "b",
      defaultLookback: 2,
      defaultTimeoutMs: 2000,
      run: stubRun,
    });

    assert.deepStrictEqual(registry.names().sort(), ["a", "b"]);
    assert.strictEqual(registry.list().length, 2);
  });
});
