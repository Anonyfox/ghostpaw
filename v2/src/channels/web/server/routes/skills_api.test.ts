import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createSkillsApiHandlers } from "./skills_api.ts";

describe("skills_api", () => {
  it("creates all expected handler functions", () => {
    const handlers = createSkillsApiHandlers();
    ok(typeof handlers.list === "function");
    ok(typeof handlers.detail === "function");
    ok(typeof handlers.validate === "function");
  });

  it("detail returns 400 when name is missing", () => {
    const handlers = createSkillsApiHandlers();
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
      params: {},
    };
    handlers.detail(ctx);
    strictEqual(statusCode, 400);
    ok(JSON.parse(body).error.includes("Missing"));
  });

  it("validate returns 400 when name is missing", () => {
    const handlers = createSkillsApiHandlers();
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
      params: {},
    };
    handlers.validate(ctx);
    strictEqual(statusCode, 400);
    ok(JSON.parse(body).error.includes("Missing"));
  });
});
