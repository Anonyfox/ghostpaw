import { deepStrictEqual, throws } from "node:assert";
import { describe, it } from "node:test";
import { parseCommand } from "./parse_command.ts";

describe("parseCommand", () => {
  it("parses a simple command with args", () => {
    deepStrictEqual(parseCommand("npx -y @mcp/server"), {
      command: "npx",
      args: ["-y", "@mcp/server"],
    });
  });

  it("handles double-quoted paths with spaces", () => {
    deepStrictEqual(parseCommand('node "/path/with spaces/server.js"'), {
      command: "node",
      args: ["/path/with spaces/server.js"],
    });
  });

  it("handles single-quoted paths with spaces", () => {
    deepStrictEqual(parseCommand("node '/path/with spaces/server.js'"), {
      command: "node",
      args: ["/path/with spaces/server.js"],
    });
  });

  it("handles command with no arguments", () => {
    deepStrictEqual(parseCommand("node"), {
      command: "node",
      args: [],
    });
  });

  it("handles multiple spaces between arguments", () => {
    deepStrictEqual(parseCommand("npx   -y   @mcp/server"), {
      command: "npx",
      args: ["-y", "@mcp/server"],
    });
  });

  it("trims leading and trailing whitespace", () => {
    deepStrictEqual(parseCommand("  node server.js  "), {
      command: "node",
      args: ["server.js"],
    });
  });

  it("throws on empty string", () => {
    throws(() => parseCommand(""), /empty/);
  });

  it("throws on whitespace-only string", () => {
    throws(() => parseCommand("   "), /empty/);
  });

  it("handles mixed quoted and unquoted arguments", () => {
    deepStrictEqual(parseCommand('node --flag "my arg" plain'), {
      command: "node",
      args: ["--flag", "my arg", "plain"],
    });
  });

  it("handles tabs as separators", () => {
    deepStrictEqual(parseCommand("npx\t-y\t@mcp/server"), {
      command: "npx",
      args: ["-y", "@mcp/server"],
    });
  });
});
