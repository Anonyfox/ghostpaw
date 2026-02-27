import { ok, strictEqual } from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import { describe, it } from "node:test";
import { parseConfigSetBody } from "./parse_config_set_body.ts";

function mockReq(body: object): IncomingMessage {
  const json = JSON.stringify(body);
  const req = Readable.from([json]) as IncomingMessage;
  req.headers = { "content-type": "application/json" };
  return req;
}

describe("parseConfigSetBody", () => {
  it("parses valid known key", async () => {
    const result = await parseConfigSetBody(mockReq({ key: "default_model", value: "gpt-4" }));
    ok(!("error" in result));
    strictEqual(result.key, "default_model");
    strictEqual(result.isKnown, true);
  });

  it("parses custom key with explicit type", async () => {
    const result = await parseConfigSetBody(
      mockReq({ key: "my_custom", value: "42", type: "number" }),
    );
    ok(!("error" in result));
    strictEqual(result.key, "my_custom");
    strictEqual(result.isKnown, false);
  });

  it("returns error for missing key", async () => {
    const result = await parseConfigSetBody(mockReq({ value: "x" }));
    ok("error" in result);
    ok(result.error.includes("key"));
  });

  it("returns error for missing value", async () => {
    const result = await parseConfigSetBody(mockReq({ key: "foo" }));
    ok("error" in result);
    ok(result.error.includes("value"));
  });

  it("returns error for invalid JSON", async () => {
    const req = Readable.from(["not json"]) as IncomingMessage;
    req.headers = { "content-type": "application/json" };
    const result = await parseConfigSetBody(req);
    ok("error" in result);
  });
});
