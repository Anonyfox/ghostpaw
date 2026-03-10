import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import { openTestDatabase } from "../../../../lib/open_test_database.ts";
import { createSkillsApiHandlers } from "./skills_api.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
});

afterEach(() => {
  db.close();
});

describe("skills_api", () => {
  it("creates all expected handler functions", () => {
    const handlers = createSkillsApiHandlers(db);
    ok(typeof handlers.list === "function");
    ok(typeof handlers.detail === "function");
    ok(typeof handlers.validate === "function");
  });

  it("detail returns 400 when name is missing", () => {
    const handlers = createSkillsApiHandlers(db);
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
    const handlers = createSkillsApiHandlers(db);
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
