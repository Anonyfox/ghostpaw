import { ok, strictEqual, throws } from "node:assert";
import { createServer, type Server } from "node:http";
import { afterEach, describe, it } from "node:test";
import { createHttpTransport, validateHttpUrl } from "./transport_http.ts";
import type { McpTransport } from "./types.ts";

let server: Server | null = null;
let transport: McpTransport | null = null;
let serverPort = 0;

function startServer(
  handler: (
    req: {
      method: string;
      url: string;
      headers: Record<string, string | string[] | undefined>;
      body: string;
    },
    respond: (status: number, headers: Record<string, string>, body: string) => void,
  ) => void,
): Promise<number> {
  return new Promise((resolve) => {
    server = createServer((req, res) => {
      let body = "";
      req.on("data", (c) => {
        body += c;
      });
      req.on("end", () => {
        handler(
          {
            method: req.method!,
            url: req.url!,
            headers: req.headers as Record<string, string>,
            body,
          },
          (status, headers, responseBody) => {
            res.writeHead(status, headers);
            res.end(responseBody);
          },
        );
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server!.address() as { port: number };
      resolve(addr.port);
    });
  });
}

afterEach(async () => {
  if (transport) {
    await transport.close();
    transport = null;
  }
  if (server) {
    await new Promise<void>((r) => server!.close(() => r()));
    server = null;
  }
});

describe("validateHttpUrl", () => {
  it("accepts https URLs", () => {
    validateHttpUrl("https://example.com/mcp");
  });

  it("accepts localhost http", () => {
    validateHttpUrl("http://localhost:3000/mcp");
    validateHttpUrl("http://127.0.0.1:8080/mcp");
  });

  it("rejects remote http", () => {
    throws(() => validateHttpUrl("http://example.com/mcp"), /requires HTTPS/);
  });

  it("rejects invalid URLs", () => {
    throws(() => validateHttpUrl("not-a-url"), /Invalid MCP HTTP URL/);
  });
});

describe("HttpTransport", () => {
  it("sends request and receives JSON response", async () => {
    serverPort = await startServer(({ body }, respond) => {
      const msg = JSON.parse(body);
      respond(
        200,
        { "Content-Type": "application/json" },
        JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { ok: true } }),
      );
    });

    transport = createHttpTransport({ url: `http://127.0.0.1:${serverPort}/mcp` });
    const resp = await transport.send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {},
    });

    ok(resp !== null);
    strictEqual(resp!.id, 1);
    strictEqual((resp!.result as Record<string, unknown>).ok, true);
  });

  it("handles SSE responses", async () => {
    serverPort = await startServer(({ body }, respond) => {
      const msg = JSON.parse(body);
      const sseBody = `data: ${JSON.stringify({
        jsonrpc: "2.0",
        id: msg.id,
        result: { sse: true },
      })}\n\n`;
      respond(200, { "Content-Type": "text/event-stream" }, sseBody);
    });

    transport = createHttpTransport({ url: `http://127.0.0.1:${serverPort}/mcp` });
    const resp = await transport.send({ jsonrpc: "2.0", id: 1, method: "tools/list" });

    ok(resp !== null);
    strictEqual((resp!.result as Record<string, unknown>).sse, true);
  });

  it("tracks Mcp-Session-Id across requests", async () => {
    let receivedSessionId = "";
    let callCount = 0;

    serverPort = await startServer(({ body, headers }, respond) => {
      callCount++;
      if (callCount > 1) receivedSessionId = (headers["mcp-session-id"] as string) ?? "";

      let id: number | undefined;
      try {
        id = JSON.parse(body).id;
      } catch {
        /* notification */
      }

      if (id !== undefined) {
        respond(
          200,
          { "Content-Type": "application/json", "Mcp-Session-Id": "sess-abc-123" },
          JSON.stringify({ jsonrpc: "2.0", id, result: {} }),
        );
      } else {
        respond(200, { "Mcp-Session-Id": "sess-abc-123" }, "");
      }
    });

    transport = createHttpTransport({ url: `http://127.0.0.1:${serverPort}/mcp` });
    await transport.send({ jsonrpc: "2.0", id: 1, method: "initialize" });
    await transport.send({ jsonrpc: "2.0", id: 2, method: "tools/list" });

    strictEqual(receivedSessionId, "sess-abc-123");
  });

  it("sends Authorization header when configured", async () => {
    let receivedAuth = "";
    serverPort = await startServer(({ body, headers }, respond) => {
      receivedAuth = (headers.authorization as string) ?? "";
      const msg = JSON.parse(body);
      respond(
        200,
        { "Content-Type": "application/json" },
        JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: {} }),
      );
    });

    transport = createHttpTransport({
      url: `http://127.0.0.1:${serverPort}/mcp`,
      headers: { Authorization: "Bearer my-token" },
    });
    await transport.send({ jsonrpc: "2.0", id: 1, method: "initialize" });

    strictEqual(receivedAuth, "Bearer my-token");
  });

  it("sends MCP-Protocol-Version header", async () => {
    let receivedVersion = "";
    serverPort = await startServer(({ body, headers }, respond) => {
      receivedVersion = (headers["mcp-protocol-version"] as string) ?? "";
      const msg = JSON.parse(body);
      respond(
        200,
        { "Content-Type": "application/json" },
        JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: {} }),
      );
    });

    transport = createHttpTransport({ url: `http://127.0.0.1:${serverPort}/mcp` });
    await transport.send({ jsonrpc: "2.0", id: 1, method: "initialize" });

    strictEqual(receivedVersion, "2025-03-26");
  });

  it("returns null for notifications", async () => {
    serverPort = await startServer((_req, respond) => {
      respond(200, { "Content-Type": "application/json" }, "");
    });

    transport = createHttpTransport({ url: `http://127.0.0.1:${serverPort}/mcp` });
    const resp = await transport.send({ jsonrpc: "2.0", method: "notifications/initialized" });

    strictEqual(resp, null);
  });

  it("throws on HTTP error status", async () => {
    serverPort = await startServer((_req, respond) => {
      respond(401, { "Content-Type": "application/json" }, '{"error":"unauthorized"}');
    });

    transport = createHttpTransport({ url: `http://127.0.0.1:${serverPort}/mcp` });

    try {
      await transport.send({ jsonrpc: "2.0", id: 1, method: "test" });
      ok(false, "should have thrown");
    } catch (err) {
      ok((err as Error).message.includes("401"));
    }
  });

  it("throws on timeout", async () => {
    serverPort = await startServer(() => {
      // never respond
    });

    transport = createHttpTransport({
      url: `http://127.0.0.1:${serverPort}/mcp`,
      timeoutMs: 200,
    });

    try {
      await transport.send({ jsonrpc: "2.0", id: 1, method: "slow" });
      ok(false, "should have thrown");
    } catch (err) {
      ok((err as Error).message.includes("timed out") || (err as Error).message.includes("abort"));
    }
  });

  it("rejects after close", async () => {
    serverPort = await startServer(({ body }, respond) => {
      const msg = JSON.parse(body);
      respond(
        200,
        { "Content-Type": "application/json" },
        JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: {} }),
      );
    });

    transport = createHttpTransport({ url: `http://127.0.0.1:${serverPort}/mcp` });
    await transport.close();
    ok(!transport.isConnected());

    try {
      await transport.send({ jsonrpc: "2.0", id: 1, method: "test" });
      ok(false, "should have thrown");
    } catch (err) {
      ok((err as Error).message.includes("disconnected"));
    }
  });

  it("sends DELETE on close when session exists", async () => {
    let deleteReceived = false;
    serverPort = await startServer(({ method, body }, respond) => {
      if (method === "DELETE") {
        deleteReceived = true;
        respond(200, {}, "");
        return;
      }
      const msg = JSON.parse(body);
      respond(
        200,
        { "Content-Type": "application/json", "Mcp-Session-Id": "sess-del" },
        JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: {} }),
      );
    });

    transport = createHttpTransport({ url: `http://127.0.0.1:${serverPort}/mcp` });
    await transport.send({ jsonrpc: "2.0", id: 1, method: "initialize" });
    await transport.close();

    ok(deleteReceived);
    transport = null;
  });

  it("close is idempotent", async () => {
    serverPort = await startServer(({ body }, respond) => {
      const msg = JSON.parse(body);
      respond(
        200,
        { "Content-Type": "application/json" },
        JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: {} }),
      );
    });

    transport = createHttpTransport({ url: `http://127.0.0.1:${serverPort}/mcp` });
    await transport.close();
    await transport.close();
    ok(!transport.isConnected());
    transport = null;
  });
});
