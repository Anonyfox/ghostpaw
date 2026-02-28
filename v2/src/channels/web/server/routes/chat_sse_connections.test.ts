import { strictEqual } from "node:assert/strict";
import type { ServerResponse } from "node:http";
import { afterEach, describe, it } from "node:test";
import { sseConnections } from "./chat_sse_connections.ts";

function fakeRes(): ServerResponse {
  return {} as ServerResponse;
}

describe("sseConnections", () => {
  afterEach(() => {
    sseConnections.remove(1);
    sseConnections.remove(2);
  });

  it("stores and retrieves a connection by session ID", () => {
    const res = fakeRes();
    sseConnections.set(1, res);
    strictEqual(sseConnections.get(1), res);
  });

  it("returns undefined for unknown session ID", () => {
    strictEqual(sseConnections.get(999), undefined);
  });

  it("has returns true when connected", () => {
    sseConnections.set(1, fakeRes());
    strictEqual(sseConnections.has(1), true);
  });

  it("has returns false when not connected", () => {
    strictEqual(sseConnections.has(99), false);
  });

  it("remove clears the entry", () => {
    sseConnections.set(1, fakeRes());
    sseConnections.remove(1);
    strictEqual(sseConnections.has(1), false);
    strictEqual(sseConnections.get(1), undefined);
  });

  it("count reflects active connections", () => {
    strictEqual(sseConnections.count(), 0);
    sseConnections.set(1, fakeRes());
    sseConnections.set(2, fakeRes());
    strictEqual(sseConnections.count(), 2);
    sseConnections.remove(1);
    strictEqual(sseConnections.count(), 1);
  });

  it("overwrites an existing connection for the same session", () => {
    const res1 = fakeRes();
    const res2 = fakeRes();
    sseConnections.set(1, res1);
    sseConnections.set(1, res2);
    strictEqual(sseConnections.get(1), res2);
    strictEqual(sseConnections.count(), 1);
  });
});
