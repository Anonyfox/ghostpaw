import assert from "node:assert";
import { describe, it } from "node:test";
import { createSubsystemRegistry } from "./registry.ts";
import { createDeflectionTools } from "./self_call.ts";

const stubRun = async () => ({ sessionId: 0, summary: "", succeeded: false });

describe("createDeflectionTools", () => {
  it("creates one deflection tool per registered subsystem", () => {
    const registry = createSubsystemRegistry();
    registry.register({
      name: "scribe",
      defaultLookback: 3,
      defaultTimeoutMs: 5000,
      run: stubRun,
    });
    registry.register({
      name: "pack",
      defaultLookback: 2,
      defaultTimeoutMs: 3000,
      run: stubRun,
    });

    const tools = createDeflectionTools(registry);
    assert.strictEqual(tools.length, 2);

    const names = tools.map((t) => t.name).sort();
    assert.deepStrictEqual(names, ["subsystem_pack", "subsystem_scribe"]);
  });

  it("deflection tool returns automatic message", async () => {
    const registry = createSubsystemRegistry();
    registry.register({
      name: "scribe",
      defaultLookback: 3,
      defaultTimeoutMs: 5000,
      run: stubRun,
    });

    const tools = createDeflectionTools(registry);
    const tool = tools[0];

    // biome-ignore lint/suspicious/noExplicitAny: duck-typed tool in test
    const result = await (tool as any).executeCall({
      id: "test-1",
      name: "subsystem_scribe",
      args: {},
    });

    const r = result as { id: string; result: string; success: boolean };
    assert.strictEqual(r.id, "test-1");
    assert.strictEqual(r.success, true);
    assert.ok(r.result.includes("automatically"));
  });

  it("returns empty array for empty registry", () => {
    const registry = createSubsystemRegistry();
    const tools = createDeflectionTools(registry);
    assert.strictEqual(tools.length, 0);
  });
});
