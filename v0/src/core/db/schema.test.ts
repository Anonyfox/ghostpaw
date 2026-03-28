import assert from "node:assert";
import { describe, it } from "node:test";
import { SCHEMA_SQL } from "./schema.ts";

describe("SCHEMA_SQL", () => {
  it("contains CREATE TABLE for sessions", () => {
    assert.ok(SCHEMA_SQL.includes("CREATE TABLE IF NOT EXISTS sessions"));
  });

  it("contains CREATE TABLE for messages", () => {
    assert.ok(SCHEMA_SQL.includes("CREATE TABLE IF NOT EXISTS messages"));
  });

  it("contains CREATE TABLE for tool_calls", () => {
    assert.ok(SCHEMA_SQL.includes("CREATE TABLE IF NOT EXISTS tool_calls"));
  });

  it("enforces STRICT tables", () => {
    assert.ok(SCHEMA_SQL.includes(") STRICT;"));
  });

  it("creates indexes", () => {
    assert.ok(SCHEMA_SQL.includes("CREATE INDEX IF NOT EXISTS idx_messages_session"));
    assert.ok(SCHEMA_SQL.includes("CREATE INDEX IF NOT EXISTS idx_tool_calls_message"));
  });
});
