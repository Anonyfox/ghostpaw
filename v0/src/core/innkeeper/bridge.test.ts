import assert from "node:assert";
import { describe, it } from "node:test";
import { openMemoryAffinityDatabase } from "../db/open_affinity.ts";
import { bridgeAffinityTools } from "./bridge.ts";

describe("bridgeAffinityTools", () => {
  it("returns 11 bridged tools", () => {
    const db = openMemoryAffinityDatabase();
    const tools = bridgeAffinityTools(db);
    assert.strictEqual(tools.length, 11);
    db.close();
  });

  it("each tool has name, description, and getParametersSchema", () => {
    const db = openMemoryAffinityDatabase();
    const tools = bridgeAffinityTools(db);

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

  it("search_affinity tool can be executed", async () => {
    const db = openMemoryAffinityDatabase();
    const tools = bridgeAffinityTools(db);
    const searchTool = tools.find((t) => t.name === "search_affinity");
    assert.ok(searchTool, "should have search_affinity tool");

    const call = {
      id: "test-call-1",
      name: "search_affinity",
      args: { query: "test" },
    };

    // biome-ignore lint/suspicious/noExplicitAny: duck-typed tool in test
    const result = await (searchTool as any).executeCall(call);
    assert.ok(result);
    assert.strictEqual((result as { id: string }).id, "test-call-1");
    assert.strictEqual((result as { success: boolean }).success, true);

    db.close();
  });
});
