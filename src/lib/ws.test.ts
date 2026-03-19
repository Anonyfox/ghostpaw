import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { createServer } from "node:http";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { WsConnection } from "./ws.ts";
import { upgradeToWebSocket } from "./ws.ts";

function listen(server: ReturnType<typeof createServer>): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      resolve(addr.port);
    });
  });
}

function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    ws.addEventListener("open", () => resolve(), { once: true });
    ws.addEventListener("error", (e) => reject(e), { once: true });
  });
}

function waitForMessage(ws: WebSocket): Promise<string> {
  return new Promise((resolve) => {
    ws.addEventListener("message", (e) => resolve(String(e.data)), { once: true });
  });
}

function waitForClose(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    ws.addEventListener("close", () => resolve(), { once: true });
  });
}

describe("ws", () => {
  let server: ReturnType<typeof createServer>;
  let port: number;
  let lastConn: WsConnection | null = null;

  beforeEach(async () => {
    server = createServer((_req, res) => {
      res.writeHead(200);
      res.end("ok");
    });
    server.on("upgrade", (req, socket, head) => {
      const conn = upgradeToWebSocket(req, socket, head);
      lastConn = conn;
    });
    port = await listen(server);
  });

  afterEach(() => {
    lastConn = null;
    server.close();
  });

  it("completes the WebSocket handshake", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    await waitForOpen(ws);
    strictEqual(ws.readyState, WebSocket.OPEN);
    ws.close();
    await waitForClose(ws);
  });

  it("receives messages from server", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    await waitForOpen(ws);
    ok(lastConn);
    const msgPromise = waitForMessage(ws);
    lastConn.send("hello from server");
    const msg = await msgPromise;
    strictEqual(msg, "hello from server");
    ws.close();
    await waitForClose(ws);
  });

  it("server receives messages from client", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    await waitForOpen(ws);
    ok(lastConn);

    const received = new Promise<string>((resolve) => {
      lastConn!.on("message", resolve);
    });
    ws.send("hello from client");
    strictEqual(await received, "hello from client");
    ws.close();
    await waitForClose(ws);
  });

  it("handles server-initiated close", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    await waitForOpen(ws);
    ok(lastConn);
    const closePromise = waitForClose(ws);
    lastConn.close();
    await closePromise;
  });

  it("handles client-initiated close", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    await waitForOpen(ws);
    ok(lastConn);
    const serverClose = new Promise<void>((resolve) => {
      lastConn!.on("close", resolve as () => void);
    });
    ws.close();
    await serverClose;
  });

  it("echoes multiple messages", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    await waitForOpen(ws);
    ok(lastConn);

    lastConn.on("message", (data) => {
      lastConn!.send(`echo: ${data}`);
    });

    const messages: string[] = [];
    const allReceived = new Promise<void>((resolve) => {
      ws.addEventListener("message", (e) => {
        messages.push(String(e.data));
        if (messages.length === 3) resolve();
      });
    });

    ws.send("one");
    ws.send("two");
    ws.send("three");

    await allReceived;
    deepStrictEqual(messages, ["echo: one", "echo: two", "echo: three"]);
    ws.close();
    await waitForClose(ws);
  });

  it("handles JSON payloads", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    await waitForOpen(ws);
    ok(lastConn);

    const received = new Promise<string>((resolve) => {
      lastConn!.on("message", resolve);
    });

    const payload = { type: "send", content: "hello world", model: "gpt-4" };
    ws.send(JSON.stringify(payload));

    const data = JSON.parse(await received);
    deepStrictEqual(data, payload);
    ws.close();
    await waitForClose(ws);
  });
});
