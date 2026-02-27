import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { loadSqlite } from "./load_sqlite.ts";

describe("loadSqlite", () => {
  it("returns the node:sqlite module", async () => {
    const mod = await loadSqlite();
    ok(mod.DatabaseSync, "DatabaseSync constructor exists");
  });
});
