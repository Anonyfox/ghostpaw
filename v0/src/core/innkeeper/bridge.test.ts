import assert from "node:assert";
import { describe, it } from "node:test";
import { openMemoryAffinityDatabase } from "../db/open_affinity.ts";
import { bridgeAffinityTools, normalizeAttributeArgs } from "./bridge.ts";

describe("bridgeAffinityTools", () => {
  it("returns 12 bridged tools", async () => {
    const db = await openMemoryAffinityDatabase();
    const tools = bridgeAffinityTools(db);
    assert.strictEqual(tools.length, 12);
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

describe("normalizeAttributeArgs", () => {
  it("rewrites flat target.contactId into nested target.contact.contactId", () => {
    const args = { action: "set", target: { kind: "contact", contactId: 5 }, name: "role", value: "CTO" };
    const result = normalizeAttributeArgs(args);
    assert.deepStrictEqual(result.target, { kind: "contact", contact: { contactId: 5 } });
    assert.strictEqual(result.name, "role");
    assert.strictEqual(result.value, "CTO");
  });

  it("rewrites flat target.linkId into nested target.link.linkId", () => {
    const args = { action: "set", target: { kind: "link", linkId: 3 }, name: "note", value: "test" };
    const result = normalizeAttributeArgs(args);
    assert.deepStrictEqual(result.target, { kind: "link", link: { linkId: 3 } });
  });

  it("passes through already-correct nested structure", () => {
    const args = {
      action: "set",
      target: { kind: "contact", contact: { contactId: 5 } },
      name: "role",
      value: "CTO",
    };
    const result = normalizeAttributeArgs(args);
    assert.deepStrictEqual(result, args);
  });

  it("passes through when target is missing", () => {
    const args = { action: "set", name: "x", value: "y" };
    const result = normalizeAttributeArgs(args);
    assert.deepStrictEqual(result, args);
  });
});
