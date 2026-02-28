import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initChatTables } from "../../core/chat/index.ts";
import { initConfigTable } from "../../core/config/index.ts";
import { initSecretsTable } from "../../core/secrets/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
});

afterEach(() => {
  db.close();
});

describe("withRunDb tables", () => {
  it("initializes all three table sets without error", () => {
    initSecretsTable(db);
    initConfigTable(db);
    initChatTables(db);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);

    ok(names.includes("secrets"));
    ok(names.includes("config"));
    ok(names.includes("sessions"));
    ok(names.includes("messages"));
  });

  it("is idempotent — calling twice does not error", () => {
    initSecretsTable(db);
    initConfigTable(db);
    initChatTables(db);
    initSecretsTable(db);
    initConfigTable(db);
    initChatTables(db);

    const sessions = db.prepare("PRAGMA table_info(sessions)").all();
    ok(sessions.length > 0);
  });

  it("tables are independent — chat queries work after all inits", () => {
    initSecretsTable(db);
    initConfigTable(db);
    initChatTables(db);

    const now = Date.now();
    db.prepare("INSERT INTO sessions (key, created_at, last_active_at) VALUES (?, ?, ?)").run(
      "test",
      now,
      now,
    );
    const row = db.prepare("SELECT key FROM sessions").get() as { key: string };
    strictEqual(row.key, "test");
  });
});
