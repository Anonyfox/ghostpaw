import { ok, strictEqual } from "node:assert";
import { afterEach, describe, it } from "node:test";
import { createStdioTransport } from "./transport_stdio.ts";
import type { McpTransport } from "./types.ts";

const ECHO_SCRIPT = `
const rl = require("readline").createInterface({ input: process.stdin });
rl.on("line", (line) => {
  try {
    const msg = JSON.parse(line);
    if (msg.id !== undefined) {
      const resp = { jsonrpc: "2.0", id: msg.id, result: { method: msg.method } };
      process.stdout.write(JSON.stringify(resp) + "\\n");
    }
  } catch {}
});
`;

const SLOW_SCRIPT = `
const rl = require("readline").createInterface({ input: process.stdin });
rl.on("line", () => {});
`;

const CRASH_SCRIPT = "process.exit(42);";

let transport: McpTransport | null = null;

afterEach(async () => {
  if (transport) {
    await transport.close();
    transport = null;
  }
});

describe("StdioTransport", () => {
  it("sends a request and receives a response", async () => {
    transport = createStdioTransport({ command: "node", args: ["-e", ECHO_SCRIPT] });
    ok(transport.isConnected());

    const resp = await transport.send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {},
    });

    ok(resp !== null);
    strictEqual(resp!.id, 1);
    strictEqual((resp!.result as Record<string, unknown>).method, "initialize");
  });

  it("returns null for notifications", async () => {
    transport = createStdioTransport({ command: "node", args: ["-e", ECHO_SCRIPT] });

    const resp = await transport.send({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });

    strictEqual(resp, null);
  });

  it("handles multiple sequential requests", async () => {
    transport = createStdioTransport({ command: "node", args: ["-e", ECHO_SCRIPT] });

    const r1 = await transport.send({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    const r2 = await transport.send({ jsonrpc: "2.0", id: 2, method: "tools/call" });

    strictEqual(r1!.id, 1);
    strictEqual(r2!.id, 2);
  });

  it("times out on unresponsive server", async () => {
    transport = createStdioTransport({
      command: "node",
      args: ["-e", SLOW_SCRIPT],
      timeoutMs: 200,
    });

    try {
      await transport.send({ jsonrpc: "2.0", id: 1, method: "hang" });
      ok(false, "should have thrown");
    } catch (err) {
      ok((err as Error).message.includes("timed out"));
    }
  });

  it("rejects after process crash", async () => {
    transport = createStdioTransport({ command: "node", args: ["-e", CRASH_SCRIPT] });

    await new Promise((r) => setTimeout(r, 500));
    ok(!transport.isConnected());

    try {
      await transport.send({ jsonrpc: "2.0", id: 1, method: "test" });
      ok(false, "should have thrown");
    } catch (err) {
      ok((err as Error).message.includes("disconnected"));
    }
  });

  it("passes configured env vars only", async () => {
    const script = `process.stdout.write(JSON.stringify({
      jsonrpc: "2.0", id: 1,
      result: { hasPath: !!process.env.PATH, custom: process.env.MY_VAR || "" }
    }) + "\\n");`;

    transport = createStdioTransport({
      command: "node",
      args: ["-e", script],
      env: { MY_VAR: "hello" },
    });

    const resp = await transport.send({ jsonrpc: "2.0", id: 1, method: "check" });
    const result = resp!.result as Record<string, unknown>;
    ok(result.hasPath);
    strictEqual(result.custom, "hello");
  });

  it("close is idempotent", async () => {
    transport = createStdioTransport({ command: "node", args: ["-e", ECHO_SCRIPT] });

    await transport.close();
    await transport.close();
    ok(!transport.isConnected());
    transport = null;
  });

  it("filters non-JSON stdout lines", async () => {
    const noisyScript = `
const rl = require("readline").createInterface({ input: process.stdin });
rl.on("line", (line) => {
  process.stdout.write("WARNING: this is noise\\n");
  try {
    const msg = JSON.parse(line);
    if (msg.id !== undefined) {
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: "ok" }) + "\\n");
    }
  } catch {}
});
`;
    transport = createStdioTransport({ command: "node", args: ["-e", noisyScript] });

    const resp = await transport.send({ jsonrpc: "2.0", id: 1, method: "test" });
    ok(resp !== null);
    strictEqual(resp!.result, "ok");
  });
});
