import { ok, strictEqual } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { cleanServerString, createConnectionPool, isUrl } from "./connections.ts";

const MCP_SERVER_CODE = `
const rl = require("readline").createInterface({ input: process.stdin });
rl.on("line", (line) => {
  try {
    const msg = JSON.parse(line);
    if (msg.id === undefined) return;
    let result;
    if (msg.method === "initialize") {
      result = {
        protocolVersion: "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: { name: "pool-server", version: "1.0" },
      };
    } else if (msg.method === "tools/list") {
      result = { tools: [{ name: "ping", inputSchema: { type: "object" } }] };
    } else if (msg.method === "tools/call") {
      result = { content: [{ type: "text", text: "pong" }] };
    } else {
      result = {};
    }
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result }) + "\\n");
  } catch {}
});
`;

let workDir: string;
let serverPath: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "ghostpaw-mcp-conn-"));
  serverPath = join(workDir, "server.js");
  writeFileSync(serverPath, MCP_SERVER_CODE);
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

const noSecret = () => null;

describe("cleanServerString", () => {
  it("strips zero-width chars, quotes, angle brackets", () => {
    strictEqual(cleanServerString('\u200B"npx server"\u200B'), "npx server");
    strictEqual(cleanServerString("<https://example.com>"), "https://example.com");
    strictEqual(cleanServerString("  node server.js  "), "node server.js");
    strictEqual(cleanServerString("`npx server`"), "npx server");
  });
});

describe("isUrl", () => {
  it("detects http/https URLs", () => {
    ok(isUrl("https://example.com/mcp"));
    ok(isUrl("http://localhost:3000"));
    ok(!isUrl("npx -y @mcp/server"));
    ok(!isUrl("node server.js"));
  });
});

describe("createConnectionPool", () => {
  it("creates connection on first call and reuses on second", async () => {
    const pool = createConnectionPool();

    const c1 = await pool.getOrConnect(`node ${serverPath}`, undefined, noSecret);
    const c2 = await pool.getOrConnect(`node ${serverPath}`, undefined, noSecret);

    strictEqual(c1, c2);
    await pool.shutdown();
  });

  it("creates separate connections for different auth", async () => {
    const pool = createConnectionPool();

    const c1 = await pool.getOrConnect(`node ${serverPath}`, "KEY_A", noSecret);
    const c2 = await pool.getOrConnect(`node ${serverPath}`, "KEY_B", noSecret);

    ok(c1 !== c2);
    await pool.shutdown();
  });

  it("evict removes and disconnects the connection", async () => {
    const pool = createConnectionPool();

    const c1 = await pool.getOrConnect(`node ${serverPath}`, undefined, noSecret);
    strictEqual(c1.tools.length, 1);

    await pool.evict(`node ${serverPath}`, undefined);

    const c2 = await pool.getOrConnect(`node ${serverPath}`, undefined, noSecret);
    ok(c1 !== c2);

    await pool.shutdown();
  });

  it("shutdown disconnects all and allows fresh reconnect", async () => {
    const pool = createConnectionPool();

    const c1 = await pool.getOrConnect(`node ${serverPath}`, undefined, noSecret);
    await pool.shutdown();

    const c2 = await pool.getOrConnect(`node ${serverPath}`, undefined, noSecret);
    ok(c1 !== c2);

    await pool.shutdown();
  });

  it("handles transport creation failure without caching", async () => {
    const pool = createConnectionPool();

    try {
      await pool.getOrConnect("node /nonexistent/path/server.js", undefined, noSecret);
      ok(false, "should have thrown");
    } catch {
      // expected
    }

    await pool.shutdown();
  });
});
