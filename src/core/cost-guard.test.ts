import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  createCostGuard,
  getSpendBreakdown,
  getSpendInWindow,
  getSpendStatus,
  isSpendBlocked,
} from "./cost-guard.js";
import { createDatabase, type GhostpawDatabase } from "./database.js";

let db: GhostpawDatabase;

function insertRun(
  model: string,
  costUsd: number,
  createdAt: number = Date.now(),
  tokensIn = 100,
  tokensOut = 50,
) {
  const id = `run-${Math.random().toString(36).slice(2, 10)}`;
  const sessionId = "test-session";
  db.sqlite
    .prepare(
      `INSERT INTO runs (id, session_id, agent_profile, status, created_at, started_at, model, tokens_in, tokens_out, cost_usd)
       VALUES (?, ?, 'default', 'completed', ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, sessionId, createdAt, createdAt, model, tokensIn, tokensOut, costUsd);
}

function ensureSession() {
  db.sqlite
    .prepare(
      "INSERT OR IGNORE INTO sessions (id, key, created_at, last_active) VALUES ('test-session', 'test', ?, ?)",
    )
    .run(Date.now(), Date.now());
}

beforeEach(async () => {
  db = await createDatabase(":memory:");
  ensureSession();
});

afterEach(() => {
  db.close();
});

describe("getSpendInWindow", () => {
  it("returns 0 on empty database", () => {
    strictEqual(getSpendInWindow(db.sqlite), 0);
  });

  it("sums cost of runs within the window", () => {
    insertRun("gpt-5-mini", 0.01);
    insertRun("gpt-5-mini", 0.02);
    insertRun("claude-sonnet-4-6", 0.03);
    const total = getSpendInWindow(db.sqlite);
    strictEqual(Math.round(total * 1000), 60); // $0.06
  });

  it("excludes runs outside the window", () => {
    const oldTime = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
    insertRun("gpt-5-mini", 1.0, oldTime);
    insertRun("gpt-5-mini", 0.05);
    const total = getSpendInWindow(db.sqlite);
    strictEqual(Math.round(total * 1000), 50); // only $0.05
  });

  it("respects custom window size", () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    insertRun("gpt-5-mini", 0.1, twoHoursAgo);
    insertRun("gpt-5-mini", 0.05);
    const oneHourWindow = 60 * 60 * 1000;
    const total = getSpendInWindow(db.sqlite, oneHourWindow);
    strictEqual(Math.round(total * 1000), 50); // only $0.05 in 1h window
  });
});

describe("isSpendBlocked", () => {
  it("returns false when limit is 0 (disabled)", () => {
    insertRun("gpt-5-mini", 999);
    strictEqual(isSpendBlocked(db.sqlite, 0), false);
  });

  it("returns false when under limit", () => {
    insertRun("gpt-5-mini", 0.5);
    strictEqual(isSpendBlocked(db.sqlite, 1.0), false);
  });

  it("returns true when at limit", () => {
    insertRun("gpt-5-mini", 1.0);
    strictEqual(isSpendBlocked(db.sqlite, 1.0), true);
  });

  it("returns true when over limit", () => {
    insertRun("gpt-5-mini", 0.6);
    insertRun("gpt-5-mini", 0.5);
    strictEqual(isSpendBlocked(db.sqlite, 1.0), true);
  });

  it("unblocks when old runs slide out of window", () => {
    const oldTime = Date.now() - 25 * 60 * 60 * 1000;
    insertRun("gpt-5-mini", 5.0, oldTime);
    insertRun("gpt-5-mini", 0.01);
    strictEqual(isSpendBlocked(db.sqlite, 1.0), false);
  });
});

describe("getSpendStatus", () => {
  it("returns zero state on empty DB with no limit", () => {
    const s = getSpendStatus(db.sqlite, 0);
    strictEqual(s.spent, 0);
    strictEqual(s.limit, 0);
    strictEqual(s.percentage, 0);
    strictEqual(s.isBlocked, false);
    strictEqual(s.remaining, Number.POSITIVE_INFINITY);
  });

  it("computes correct percentage and remaining", () => {
    insertRun("gpt-5-mini", 0.75);
    const s = getSpendStatus(db.sqlite, 1.0);
    strictEqual(Math.round(s.spent * 100), 75);
    strictEqual(s.limit, 1.0);
    strictEqual(s.percentage, 75);
    ok(s.remaining > 0.24 && s.remaining < 0.26);
    strictEqual(s.isBlocked, false);
  });

  it("caps percentage at 100 when over limit", () => {
    insertRun("gpt-5-mini", 1.5);
    const s = getSpendStatus(db.sqlite, 1.0);
    strictEqual(s.percentage, 100);
    strictEqual(s.remaining, 0);
    strictEqual(s.isBlocked, true);
  });
});

describe("getSpendBreakdown", () => {
  it("groups by model correctly", () => {
    insertRun("gpt-5-mini", 0.01, undefined, 100, 50);
    insertRun("gpt-5-mini", 0.02, undefined, 200, 100);
    insertRun("claude-sonnet-4-6", 0.05, undefined, 500, 250);
    const b = getSpendBreakdown(db.sqlite, 1.0);
    strictEqual(b.byModel.length, 2);
    const claude = b.byModel.find((m) => m.model === "claude-sonnet-4-6");
    ok(claude);
    strictEqual(claude!.runs, 1);
    strictEqual(claude!.tokensIn, 500);
    const gpt = b.byModel.find((m) => m.model === "gpt-5-mini");
    ok(gpt);
    strictEqual(gpt!.runs, 2);
    strictEqual(gpt!.tokensIn, 300);
  });

  it("groups by day correctly", () => {
    insertRun("gpt-5-mini", 0.01);
    insertRun("gpt-5-mini", 0.02);
    const b = getSpendBreakdown(db.sqlite, 1.0);
    ok(b.byDay.length >= 1);
    const today = b.byDay[0];
    ok(today);
    ok(today!.runs >= 2);
  });

  it("includes spend status fields", () => {
    insertRun("gpt-5-mini", 0.5);
    const b = getSpendBreakdown(db.sqlite, 1.0);
    strictEqual(b.limit, 1.0);
    strictEqual(b.percentage, 50);
    strictEqual(b.isBlocked, false);
    ok(b.remaining > 0);
  });
});

describe("createCostGuard", () => {
  it("provides isBlocked and status methods", () => {
    const guard = createCostGuard(db.sqlite, 1.0);
    strictEqual(guard.isBlocked(), false);
    const s = guard.status();
    strictEqual(s.limit, 1.0);
    strictEqual(s.spent, 0);
  });

  it("blocks after reaching limit", () => {
    insertRun("gpt-5-mini", 1.0);
    const guard = createCostGuard(db.sqlite, 1.0);
    strictEqual(guard.isBlocked(), true);
    strictEqual(guard.status().isBlocked, true);
  });

  it("never blocks when limit is 0", () => {
    insertRun("gpt-5-mini", 999);
    const guard = createCostGuard(db.sqlite, 0);
    strictEqual(guard.isBlocked(), false);
  });
});
