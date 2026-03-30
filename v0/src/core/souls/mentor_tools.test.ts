import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { tools as soulsToolsNs } from "@ghostpaw/souls";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemorySoulsDatabase } from "../db/open_souls.ts";
import { bootstrapSouls } from "./bootstrap.ts";
import { createMentorTools } from "./mentor_tools.ts";

let soulsDb: DatabaseHandle;

beforeEach(() => {
  soulsDb = openMemorySoulsDatabase();
  bootstrapSouls(soulsDb);
});

afterEach(() => {
  soulsDb.close();
});

describe("createMentorTools", () => {
  it("returns one chatoyant-compatible tool per souls tool definition", () => {
    const tools = createMentorTools(soulsDb);
    assert.strictEqual(tools.length, soulsToolsNs.soulsTools.length);
  });

  it("each tool has name, description, getParametersSchema, and executeCall", () => {
    const tools = createMentorTools(soulsDb);
    for (const tool of tools) {
      assert.strictEqual(typeof tool.name, "string");
      assert.ok(tool.name.length > 0);
      assert.strictEqual(typeof tool.description, "string");
      // biome-ignore lint/suspicious/noExplicitAny: duck-typed tool bridge
      const t = tool as any;
      assert.strictEqual(typeof t.getParametersSchema, "function");
      assert.strictEqual(typeof t.executeCall, "function");
    }
  });

  it("getParametersSchema returns valid JSON Schema with $schema key", () => {
    const tools = createMentorTools(soulsDb);
    for (const tool of tools) {
      // biome-ignore lint/suspicious/noExplicitAny: duck-typed tool bridge
      const schema = (tool as any).getParametersSchema();
      assert.ok(schema.$schema, "must have $schema key");
      assert.strictEqual(schema.type, "object");
      assert.ok(schema.properties, "must have properties");
    }
  });

  it("executeCall for review_souls returns a valid result", async () => {
    const tools = createMentorTools(soulsDb);
    // biome-ignore lint/suspicious/noExplicitAny: duck-typed tool bridge
    const reviewTool = tools.find((t) => t.name === "review_souls") as any;
    assert.ok(reviewTool, "review_souls tool must exist");

    const result = await reviewTool.executeCall(
      { id: "test-1", name: "review_souls", args: { view: "list" } },
      {},
    );

    assert.strictEqual(result.id, "test-1");
    assert.strictEqual(result.success, true);
    assert.ok(result.result.ok);
    assert.ok(result.result.data.souls.length >= 4);
  });

  it("executeCall for inspect_souls_item returns soul profile", async () => {
    const tools = createMentorTools(soulsDb);
    // biome-ignore lint/suspicious/noExplicitAny: duck-typed tool bridge
    const inspectTool = tools.find((t) => t.name === "inspect_souls_item") as any;
    assert.ok(inspectTool);

    const result = await inspectTool.executeCall(
      { id: "test-2", name: "inspect_souls_item", args: { soulId: 1, includeEvidence: false } },
      {},
    );

    assert.strictEqual(result.success, true);
    assert.ok(result.result.ok);
    assert.ok(result.result.data.profile);
  });

  it("executeCall returns error for invalid input without throwing", async () => {
    const tools = createMentorTools(soulsDb);
    // biome-ignore lint/suspicious/noExplicitAny: duck-typed tool bridge
    const inspectTool = tools.find((t) => t.name === "inspect_souls_item") as any;
    assert.ok(inspectTool);

    const result = await inspectTool.executeCall(
      { id: "test-3", name: "inspect_souls_item", args: { soulId: 99999 } },
      {},
    );

    assert.strictEqual(result.id, "test-3");
    // Souls tool returns a ToolFailure (ok: false) or throws — either way the bridge handles it
    assert.ok(result.success === false || result.result.ok === false);
  });

  it("tool names match the souls package tool names exactly", () => {
    const tools = createMentorTools(soulsDb);
    const bridgedNames = tools.map((t) => t.name).sort();
    const sourceNames = soulsToolsNs.soulsTools.map((t) => t.name).sort();
    assert.deepStrictEqual(bridgedNames, sourceNames);
  });
});
