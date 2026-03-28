import assert from "node:assert";
import { describe, it } from "node:test";
import { openMemoryCodexDatabase } from "../db/open_codex.ts";
import { bridgeCodexTools } from "./bridge.ts";

describe("bridgeCodexTools", () => {
  it("returns 7 bridged tools", () => {
    const db = openMemoryCodexDatabase();
    const tools = bridgeCodexTools(db);
    assert.strictEqual(tools.length, 7);
    db.close();
  });

  it("each tool has name, description, and getParametersSchema", () => {
    const db = openMemoryCodexDatabase();
    const tools = bridgeCodexTools(db);

    for (const tool of tools) {
      assert.strictEqual(typeof tool.name, "string");
      assert.ok(tool.name.length > 0, `tool should have a name`);
      assert.strictEqual(typeof tool.description, "string");
      assert.ok(tool.description.length > 0, `${tool.name} should have a description`);

      const schema = (tool as { getParametersSchema(): unknown }).getParametersSchema();
      assert.strictEqual(typeof schema, "object");
      assert.ok(schema !== null);
    }
    db.close();
  });

  it("remember_belief tool can be executed", async () => {
    const db = openMemoryCodexDatabase();
    const tools = bridgeCodexTools(db);
    const rememberTool = tools.find((t) => t.name === "remember_belief");
    assert.ok(rememberTool, "should have remember_belief tool");

    const call = {
      id: "test-call-1",
      name: "remember_belief",
      args: {
        claim: "Test belief from bridge",
        source: "explicit",
        category: "fact",
      },
    };

    // biome-ignore lint/suspicious/noExplicitAny: duck-typed tool in test
    const result = await (rememberTool as any).executeCall(call);
    assert.ok(result);
    assert.strictEqual((result as { id: string }).id, "test-call-1");
    assert.strictEqual((result as { success: boolean }).success, true);

    db.close();
  });
});
