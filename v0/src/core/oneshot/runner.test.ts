import assert from "node:assert";
import { describe, it } from "node:test";
import { createOneshotRegistry } from "./registry.ts";
import { fireOneshots } from "./runner.ts";
import type { OneshotRunOpts } from "./types.ts";

function stubOpts(overrides?: Partial<OneshotRunOpts>): OneshotRunOpts {
  return {
    db: {} as never,
    sessionId: 1,
    triggerMessageId: 1,
    userContent: "hello",
    model: "test-model",
    timeoutMs: 5_000,
    ...overrides,
  };
}

describe("fireOneshots", () => {
  it("does nothing when no oneshots registered", async () => {
    const reg = createOneshotRegistry();
    await fireOneshots(reg, stubOpts());
  });

  it("fires oneshots where shouldFire returns true", async () => {
    const reg = createOneshotRegistry();
    const executed: string[] = [];
    reg.register({
      name: "a",
      shouldFire: () => true,
      execute: async () => {
        executed.push("a");
      },
    });
    reg.register({
      name: "b",
      shouldFire: () => false,
      execute: async () => {
        executed.push("b");
      },
    });

    await fireOneshots(reg, stubOpts());
    assert.deepStrictEqual(executed, ["a"]);
  });

  it("swallows errors from failing oneshots", async () => {
    const reg = createOneshotRegistry();
    reg.register({
      name: "failing",
      shouldFire: () => true,
      execute: async () => {
        throw new Error("boom");
      },
    });

    await fireOneshots(reg, stubOpts());
  });

  it("enforces timeout", async () => {
    const reg = createOneshotRegistry();
    reg.register({
      name: "slow",
      shouldFire: () => true,
      execute: () => new Promise((resolve) => setTimeout(resolve, 10_000)),
    });

    const start = Date.now();
    await fireOneshots(reg, stubOpts({ timeoutMs: 100 }));
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 2_000, `expected timeout in ~100ms, took ${elapsed}ms`);
  });

  it("runs multiple oneshots concurrently", async () => {
    const reg = createOneshotRegistry();
    const order: string[] = [];
    reg.register({
      name: "first",
      shouldFire: () => true,
      execute: async () => {
        await new Promise((r) => setTimeout(r, 50));
        order.push("first");
      },
    });
    reg.register({
      name: "second",
      shouldFire: () => true,
      execute: async () => {
        await new Promise((r) => setTimeout(r, 50));
        order.push("second");
      },
    });

    const start = Date.now();
    await fireOneshots(reg, stubOpts());
    const elapsed = Date.now() - start;

    assert.strictEqual(order.length, 2);
    assert.ok(elapsed < 200, `expected concurrent execution, took ${elapsed}ms`);
  });
});
