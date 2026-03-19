import { deepStrictEqual, rejects, strictEqual } from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import { describe, it } from "node:test";
import { readJsonBody } from "./body_parser.ts";

function mockReq(body: string, contentType = "application/json"): IncomingMessage {
  const req = Readable.from([body]) as IncomingMessage;
  req.headers = { "content-type": contentType };
  return req;
}

describe("readJsonBody", () => {
  it("parses valid JSON body", async () => {
    const req = mockReq('{"foo":"bar","n":42}');
    const result = await readJsonBody(req);
    deepStrictEqual(result, { foo: "bar", n: 42 });
  });

  it("rejects non-JSON content type", async () => {
    const req = mockReq('{"foo":"bar"}', "text/plain");
    await rejects(() => readJsonBody(req), /Expected Content-Type: application\/json\./);
  });

  it("rejects body exceeding size limit", async () => {
    const req = mockReq(`{"x":"${"a".repeat(100)}"}`);
    await rejects(() => readJsonBody(req, 50), /Request body too large\. Maximum: 50 bytes\./);
  });

  it("rejects malformed JSON", async () => {
    const req = mockReq("{invalid json}");
    await rejects(() => readJsonBody(req), /Request body is not valid JSON\./);
  });

  it("handles empty body (throws parse error)", async () => {
    const req = mockReq("");
    await rejects(() => readJsonBody(req), /Request body is not valid JSON\./);
  });

  it("accepts body exactly at size limit", async () => {
    const body = `{"x":"${"a".repeat(92)}"}`;
    strictEqual(body.length, 100);
    const req = mockReq(body);
    const result = await readJsonBody(req, 100);
    deepStrictEqual(result, { x: "a".repeat(92) });
  });
});
