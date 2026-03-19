import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { formatToolSchema } from "./format_schema.ts";
import type { McpToolSchema } from "./types.ts";

describe("formatToolSchema", () => {
  it("formats a tool with properties and required fields", () => {
    const tool: McpToolSchema = {
      name: "search",
      description: "Search the web",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "number" },
        },
        required: ["query"],
      },
    };

    const result = formatToolSchema(tool);
    strictEqual(result.name, "search");
    strictEqual(result.description, "Search the web");
    deepStrictEqual(result.parameters, {
      query: "string (required)",
      limit: "number (optional)",
    });
    strictEqual(result.hints, undefined);
  });

  it("handles tool with no description", () => {
    const tool: McpToolSchema = {
      name: "ping",
      inputSchema: { type: "object" },
    };
    strictEqual(formatToolSchema(tool).description, "");
  });

  it("handles tool with no properties", () => {
    const tool: McpToolSchema = {
      name: "status",
      description: "Check status",
      inputSchema: { type: "object" },
    };
    deepStrictEqual(formatToolSchema(tool).parameters, {});
  });

  it("handles property with no type", () => {
    const tool: McpToolSchema = {
      name: "test",
      inputSchema: {
        type: "object",
        properties: { data: {} },
      },
    };
    deepStrictEqual(formatToolSchema(tool).parameters, {
      data: "unknown (optional)",
    });
  });

  it("includes annotations when present", () => {
    const tool: McpToolSchema = {
      name: "read_file",
      inputSchema: { type: "object" },
      annotations: { readOnlyHint: true, destructiveHint: false },
    };
    deepStrictEqual(formatToolSchema(tool).hints, {
      readOnly: true,
      destructive: false,
    });
  });

  it("omits hints when annotations are empty", () => {
    const tool: McpToolSchema = {
      name: "test",
      inputSchema: { type: "object" },
      annotations: {},
    };
    strictEqual(formatToolSchema(tool).hints, undefined);
  });

  it("includes idempotent hint", () => {
    const tool: McpToolSchema = {
      name: "set",
      inputSchema: { type: "object" },
      annotations: { idempotentHint: true },
    };
    deepStrictEqual(formatToolSchema(tool).hints, { idempotent: true });
  });
});
