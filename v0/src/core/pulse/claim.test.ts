import assert from "node:assert";
import { describe, it } from "node:test";
import { openMemoryDatabase } from "../db/open.ts";
import { claimPulse } from "./claim.ts";

function insertPulse(
  db: ReturnType<typeof openMemoryDatabase>,
  overrides: Record<string, unknown> = {},
) {
  const defaults = {
    name: "t",
    type: "builtin",
    command: "heartbeat",
    interval_ms: null,
    cron_expr: null,
    timeout_ms: 60000,
    enabled: 1,
    next_run_at: "2020-01-01T00:00:00.000Z",
    running: 0,
    started_at: null,
  };
  const row = { ...defaults, ...overrides };
  db.prepare(
    `INSERT INTO pulses (name, type, command, interval_ms, cron_expr, timeout_ms, enabled, next_run_at, running, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    row.name,
    row.type,
    row.command,
    row.interval_ms,
    row.cron_expr,
    row.timeout_ms,
    row.enabled,
    row.next_run_at,
    row.running,
    row.started_at,
  );
  return Number(db.prepare("SELECT id FROM pulses WHERE name = ?").get(row.name)?.id ?? 0);
}

describe("claimPulse", () => {
  it("claims when due and not running", () => {
    const db = openMemoryDatabase();
    const id = insertPulse(db);
    const ok = claimPulse(db, id, "9999-12-31T23:59:59.000Z");
    assert.strictEqual(ok, true);

    const row = db.prepare("SELECT running, next_run_at FROM pulses WHERE id = ?").get(id) as {
      running: number;
      next_run_at: string;
    };
    assert.strictEqual(row.running, 1);
    assert.strictEqual(row.next_run_at, "9999-12-31T23:59:59.000Z");
  });

  it("sets started_at on successful claim", () => {
    const db = openMemoryDatabase();
    const id = insertPulse(db);
    claimPulse(db, id, "9999-12-31T23:59:59.000Z");
    const row = db.prepare("SELECT started_at FROM pulses WHERE id = ?").get(id) as {
      started_at: string | null;
    };
    assert.ok(row.started_at !== null, "started_at should be set");
    assert.ok(row.started_at.includes("T"), "started_at should be ISO format");
  });

  it("sets updated_at on successful claim", () => {
    const db = openMemoryDatabase();
    const id = insertPulse(db);
    const before = db.prepare("SELECT updated_at FROM pulses WHERE id = ?").get(id) as {
      updated_at: string;
    };
    claimPulse(db, id, "9999-12-31T23:59:59.000Z");
    const after = db.prepare("SELECT updated_at FROM pulses WHERE id = ?").get(id) as {
      updated_at: string;
    };
    assert.ok(after.updated_at >= before.updated_at);
  });

  it("fails when already running", () => {
    const db = openMemoryDatabase();
    const id = insertPulse(db, {
      running: 1,
      started_at: "2026-01-01T00:00:00.000Z",
      next_run_at: "9999-12-31T23:59:59.000Z",
    });
    assert.strictEqual(claimPulse(db, id, "9999-12-31T23:59:59.000Z"), false);
  });

  it("fails when disabled", () => {
    const db = openMemoryDatabase();
    const id = insertPulse(db, { enabled: 0 });
    assert.strictEqual(claimPulse(db, id, "9999-12-31T23:59:59.000Z"), false);
  });

  it("fails when not yet due", () => {
    const db = openMemoryDatabase();
    const id = insertPulse(db, { next_run_at: "2099-01-01T00:00:00.000Z" });
    assert.strictEqual(claimPulse(db, id, "9999-12-31T23:59:59.000Z"), false);
  });

  it("returns false for nonexistent pulse id", () => {
    const db = openMemoryDatabase();
    assert.strictEqual(claimPulse(db, 99999, "9999-12-31T23:59:59.000Z"), false);
  });

  it("second claim on same pulse fails (at-most-once)", () => {
    const db = openMemoryDatabase();
    const id = insertPulse(db);
    assert.strictEqual(claimPulse(db, id, "9999-12-31T23:59:59.000Z"), true);
    assert.strictEqual(claimPulse(db, id, "9999-12-31T23:59:59.000Z"), false);
  });
});
