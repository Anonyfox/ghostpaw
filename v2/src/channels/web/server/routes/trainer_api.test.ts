import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createTrainerApiHandlers } from "./trainer_api.ts";

function mockCtx(params: Record<string, string> = {}) {
  let statusCode = 0;
  let body = "";
  const ctx = {
    req: {} as never,
    res: {
      writeHead(code: number) {
        statusCode = code;
      },
      end(data: string) {
        body = data;
      },
    } as never,
    params,
  };
  return {
    ctx,
    status: () => statusCode,
    json: () => JSON.parse(body),
  };
}

describe("trainer_api", () => {
  it("creates all expected handler functions", () => {
    const handlers = createTrainerApiHandlers(null as never, undefined);
    ok(typeof handlers.scoutPropose === "function");
    ok(typeof handlers.scoutExecute === "function");
    ok(typeof handlers.trainPropose === "function");
    ok(typeof handlers.trainExecute === "function");
    ok(typeof handlers.status === "function");
  });

  it("scoutPropose returns 503 when entity is undefined", async () => {
    const handlers = createTrainerApiHandlers(null as never, undefined);
    const { ctx, status, json } = mockCtx();
    await handlers.scoutPropose(ctx);
    strictEqual(status(), 503);
    ok(json().error.includes("not available"));
  });

  it("scoutExecute returns 503 when entity is undefined", async () => {
    const handlers = createTrainerApiHandlers(null as never, undefined);
    const { ctx, status, json } = mockCtx();
    await handlers.scoutExecute(ctx);
    strictEqual(status(), 503);
    ok(json().error.includes("not available"));
  });

  it("trainPropose returns 503 when entity is undefined", async () => {
    const handlers = createTrainerApiHandlers(null as never, undefined);
    const { ctx, status, json } = mockCtx();
    await handlers.trainPropose(ctx);
    strictEqual(status(), 503);
    ok(json().error.includes("not available"));
  });

  it("trainExecute returns 503 when entity is undefined", async () => {
    const handlers = createTrainerApiHandlers(null as never, undefined);
    const { ctx, status, json } = mockCtx();
    await handlers.trainExecute(ctx);
    strictEqual(status(), 503);
    ok(json().error.includes("not available"));
  });
});
