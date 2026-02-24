import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import { describe, it } from "node:test";
import { parseJSON, readBody } from "./body.js";

function fakeReq(body: string, headers: Record<string, string> = {}): IncomingMessage {
  const stream = new Readable({ read() {} }) as IncomingMessage;
  stream.headers = { ...headers };
  for (const chunk of [body]) {
    stream.push(chunk);
  }
  stream.push(null);
  return stream;
}

describe("body", () => {
  describe("readBody", () => {
    it("reads a normal body", async () => {
      const req = fakeReq("hello world");
      const result = await readBody(req);
      assert.strictEqual(result, "hello world");
    });

    it("reads empty body", async () => {
      const req = fakeReq("");
      const result = await readBody(req);
      assert.strictEqual(result, "");
    });

    it("reads UTF-8 content", async () => {
      const req = fakeReq('{"name":"日本語"}');
      const result = await readBody(req);
      assert.strictEqual(result, '{"name":"日本語"}');
    });
  });

  describe("parseJSON", () => {
    it("parses valid JSON", async () => {
      const req = fakeReq('{"key":"value"}', { "content-type": "application/json" });
      const result = await parseJSON(req);
      assert.deepStrictEqual(result, { key: "value" });
    });

    it("rejects non-JSON content type", async () => {
      const req = fakeReq("hello", { "content-type": "text/plain" });
      await assert.rejects(parseJSON(req), (err: Error & { statusCode?: number }) => {
        assert.strictEqual(err.statusCode, 415);
        return true;
      });
    });

    it("rejects invalid JSON", async () => {
      const req = fakeReq("{bad json", { "content-type": "application/json" });
      await assert.rejects(parseJSON(req), (err: Error & { statusCode?: number }) => {
        assert.strictEqual(err.statusCode, 400);
        return true;
      });
    });

    it("rejects missing content-type header", async () => {
      const req = fakeReq('{"key":"value"}');
      await assert.rejects(parseJSON(req), (err: Error & { statusCode?: number }) => {
        assert.strictEqual(err.statusCode, 415);
        return true;
      });
    });
  });
});
