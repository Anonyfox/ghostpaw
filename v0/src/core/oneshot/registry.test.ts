import assert from "node:assert";
import { describe, it } from "node:test";
import { createOneshotRegistry } from "./registry.ts";
import type { OneshotDefinition } from "./types.ts";

const stubDef: OneshotDefinition = {
  name: "test-oneshot",
  shouldFire: () => true,
  execute: async () => {},
};

describe("createOneshotRegistry", () => {
  it("starts empty", () => {
    const reg = createOneshotRegistry();
    assert.deepStrictEqual(reg.list(), []);
    assert.deepStrictEqual(reg.names(), []);
  });

  it("registers and retrieves a definition", () => {
    const reg = createOneshotRegistry();
    reg.register(stubDef);
    assert.strictEqual(reg.get("test-oneshot"), stubDef);
    assert.deepStrictEqual(reg.names(), ["test-oneshot"]);
    assert.strictEqual(reg.list().length, 1);
  });

  it("returns undefined for unknown name", () => {
    const reg = createOneshotRegistry();
    assert.strictEqual(reg.get("nope"), undefined);
  });

  it("overwrites existing registration with same name", () => {
    const reg = createOneshotRegistry();
    reg.register(stubDef);
    const replacement: OneshotDefinition = { ...stubDef, shouldFire: () => false };
    reg.register(replacement);
    assert.strictEqual(reg.list().length, 1);
    assert.strictEqual(reg.get("test-oneshot")!.shouldFire({} as never), false);
  });
});
