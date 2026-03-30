import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemorySoulsDatabase } from "../db/open_souls.ts";
import { createSubsystemRegistry } from "../interceptor/registry.ts";
import { bootstrapSouls } from "../souls/bootstrap.ts";
import { registerInnkeeperSubsystem } from "./register.ts";

let soulsDb: DatabaseHandle;

beforeEach(() => {
  soulsDb = openMemorySoulsDatabase();
});

afterEach(() => {
  soulsDb.close();
});

describe("registerInnkeeperSubsystem", () => {
  it("registers the innkeeper subsystem in the registry with correct metadata", () => {
    const ids = bootstrapSouls(soulsDb);
    const registry = createSubsystemRegistry();
    registerInnkeeperSubsystem(registry, soulsDb, ids.innkeeper);

    assert.deepStrictEqual(registry.names(), ["innkeeper"]);
    const def = registry.get("innkeeper");
    assert.ok(def);
    assert.strictEqual(def.name, "innkeeper");
    assert.strictEqual(def.defaultLookback, 3);
    assert.strictEqual(def.defaultTimeoutMs, 60000);
    assert.strictEqual(typeof def.run, "function");
  });
});
