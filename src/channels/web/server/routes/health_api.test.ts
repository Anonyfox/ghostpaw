import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHealthHandler } from "./health_api.ts";

function mockCtx() {
  let statusCode = 0;
  let body = "";
  const headers: Record<string, string> = {};
  const res = {
    writeHead(status: number, h: Record<string, string>) {
      statusCode = status;
      Object.assign(headers, h);
    },
    end(data: string) {
      body = data;
    },
  };
  return {
    ctx: { req: {} as never, res: res as never, params: {} },
    status: () => statusCode,
    body: () => JSON.parse(body),
    headers: () => headers,
  };
}

describe("health_api", () => {
  it("returns status ok with version", () => {
    const handler = createHealthHandler({ version: "1.2.3", noAuth: false });
    const mock = mockCtx();
    handler(mock.ctx);
    assert.equal(mock.status(), 200);
    assert.equal(mock.body().status, "ok");
    assert.equal(mock.body().version, "1.2.3");
    assert.equal(mock.body().desktop, false);
  });

  it("returns desktop: true when noAuth", () => {
    const handler = createHealthHandler({ version: "0.0.1", noAuth: true });
    const mock = mockCtx();
    handler(mock.ctx);
    assert.equal(mock.body().desktop, true);
  });
});
