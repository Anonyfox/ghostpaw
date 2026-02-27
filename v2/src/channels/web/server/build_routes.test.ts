import { ok, strictEqual } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { initConfigTable } from "../../../core/config/index.ts";
import { initSecretsTable } from "../../../core/secrets/index.ts";
import type { DatabaseHandle } from "../../../lib/index.ts";
import { openTestDatabase } from "../../../lib/index.ts";
import { buildRoutes } from "./build_routes.ts";

describe("buildRoutes", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initSecretsTable(db);
    initConfigTable(db);
  });

  it("returns routes array and checkSession function", () => {
    const result = buildRoutes({
      passwordHash: `${"a".repeat(64)}:${"b".repeat(128)}`,
      secure: false,
      clientJs: "console.log('ok')",
      bootstrapCss: "body {}",
      bootId: "test-boot-id",
      version: "1.0.0",
      db,
      spaHandler: () => {},
    });

    ok(Array.isArray(result.routes));
    ok(result.routes.length > 0);
    ok(typeof result.checkSession === "function");
  });

  it("registers expected number of routes", () => {
    const result = buildRoutes({
      passwordHash: `${"a".repeat(64)}:${"b".repeat(128)}`,
      secure: false,
      clientJs: "",
      bootstrapCss: "",
      bootId: "x",
      version: "0.0.0",
      db,
      spaHandler: () => {},
    });

    strictEqual(result.routes.length, 14);
  });
});
