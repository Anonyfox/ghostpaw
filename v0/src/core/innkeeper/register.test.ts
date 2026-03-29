import assert from "node:assert";
import { describe, it } from "node:test";
import { createSubsystemRegistry } from "../interceptor/registry.ts";
import { registerInnkeeperSubsystem } from "./register.ts";

describe("registerInnkeeperSubsystem", () => {
  it("registers the innkeeper subsystem in the registry", () => {
    const registry = createSubsystemRegistry();
    registerInnkeeperSubsystem(registry);

    assert.deepStrictEqual(registry.names(), ["innkeeper"]);
    const def = registry.get("innkeeper");
    assert.ok(def);
    assert.strictEqual(def.name, "innkeeper");
    assert.strictEqual(def.defaultLookback, 3);
    assert.strictEqual(def.defaultTimeoutMs, 60000);
    assert.strictEqual(typeof def.run, "function");
  });
});
