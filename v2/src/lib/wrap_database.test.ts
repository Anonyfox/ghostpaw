import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { wrapDatabase } from "./wrap_database.ts";

describe("wrapDatabase", () => {
  it("wraps a raw object into a DatabaseHandle", () => {
    let lastSql = "";
    const raw = {
      exec(sql: string) {
        lastSql = sql;
      },
      prepare(_sql: string) {
        return {
          run: () => ({ changes: 0, lastInsertRowid: 0 }),
          all: () => [],
          get: () => undefined,
        };
      },
      close() {},
    };

    const db = wrapDatabase(raw);
    db.exec("PRAGMA journal_mode = WAL");
    strictEqual(lastSql, "PRAGMA journal_mode = WAL");

    const stmt = db.prepare("SELECT 1");
    ok(stmt.run);
    ok(stmt.all);
    ok(stmt.get);
  });
});
