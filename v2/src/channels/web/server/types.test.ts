import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { Route, RouteContext, RouteHandler, WebServerConfig } from "./types.ts";

describe("RouteContext", () => {
  it("has the expected shape", () => {
    const ctx: RouteContext = {
      req: {} as RouteContext["req"],
      res: {} as RouteContext["res"],
      params: { id: "42" },
      nonce: "abc",
    };
    strictEqual(ctx.nonce, "abc");
    strictEqual(ctx.params.id, "42");
  });
});

describe("Route", () => {
  it("has the expected shape", () => {
    const handler: RouteHandler = () => {};
    const route: Route = {
      method: "GET",
      pattern: /^\/$/,
      paramNames: [],
      handler,
      requiresAuth: true,
    };
    strictEqual(route.method, "GET");
    strictEqual(route.requiresAuth, true);
    ok(route.pattern.test("/"));
  });
});

describe("WebServerConfig", () => {
  it("has the expected shape with required fields", () => {
    const config: WebServerConfig = {
      port: 3000,
      passwordHash: "hash",
      clientJs: "js",
      bootstrapCss: "css",
      db: {
        exec: () => {},
        prepare: () => ({
          run: () => ({ changes: 0, lastInsertRowid: 0 }),
          all: () => [],
          get: () => undefined,
        }),
        close: () => {},
      },
    };
    strictEqual(config.port, 3000);
    strictEqual(config.secure, undefined);
  });
});
