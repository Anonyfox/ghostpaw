import assert from "node:assert";
import { describe, it } from "node:test";
import { createSubsystemRegistry } from "../interceptor/registry.ts";
import { registerScribeSubsystem } from "./register.ts";

describe("registerScribeSubsystem", () => {
  it("registers the scribe subsystem in the registry", () => {
    const registry = createSubsystemRegistry();
    registerScribeSubsystem(registry);

    assert.deepStrictEqual(registry.names(), ["scribe"]);
    const def = registry.get("scribe");
    assert.ok(def);
    assert.strictEqual(def.name, "scribe");
    assert.strictEqual(def.defaultLookback, 3);
    assert.strictEqual(def.defaultTimeoutMs, 10000);
    assert.strictEqual(typeof def.run, "function");
  });
});
