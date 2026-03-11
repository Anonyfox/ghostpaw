import { deepStrictEqual, ok, strictEqual, throws } from "node:assert";
import { describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession, initChatTables } from "../chat/index.ts";
import { initConfigTable } from "../config/index.ts";
import { initMemoryTable } from "../memory/index.ts";
import { formatSoulEvidence, gatherSoulEvidence, MANDATORY_SOUL_IDS } from "./api/read/index.ts";
import { addTrait } from "./api/write/index.ts";
import { ensureMandatorySouls, initSoulShardTables, initSoulsTables } from "./runtime/index.ts";

async function setup(): Promise<DatabaseHandle> {
  const db = await openTestDatabase();
  initSoulsTables(db);
  initSoulShardTables(db);
  initChatTables(db);
  initMemoryTable(db);
  initConfigTable(db);
  ensureMandatorySouls(db);
  return db;
}

describe("gatherSoulEvidence", () => {
  it("throws for unknown soul", async () => {
    const db = await setup();
    throws(() => gatherSoulEvidence(db, "Nonexistent"), /not found/i);
  });

  it("returns evidence for a mandatory soul", async () => {
    const db = await setup();
    const evidence = gatherSoulEvidence(db, "JS Engineer");
    strictEqual(evidence.soulId, MANDATORY_SOUL_IDS["js-engineer"]);
    strictEqual(evidence.soulName, "JS Engineer");
    strictEqual(evidence.level, 0);
    strictEqual(typeof evidence.essence, "string");
    ok(evidence.activeTraitCount >= 2);
    ok(evidence.traitLimit > 0);
    strictEqual(evidence.atCapacity, false);
    strictEqual(evidence.delegationStats.total, 0);
    ok(evidence.activeTraits.length >= 2);
    deepStrictEqual(evidence.revertedTraits, []);
    deepStrictEqual(evidence.levelHistory, []);
  });

  it("tracks delegation stats when delegate sessions exist", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS["js-engineer"];
    const parent = createSession(db, "test:parent", { purpose: "chat" });

    const s1 = createSession(db, "d:1", {
      purpose: "delegate",
      model: "test-model",
      parentSessionId: parent.id as number,
      soulId,
    });
    db.prepare(
      "UPDATE sessions SET cost_usd = 0.01, tokens_in = 100, tokens_out = 200, closed_at = ? WHERE id = ?",
    ).run(Date.now(), s1.id);

    const s2 = createSession(db, "d:2", {
      purpose: "delegate",
      model: "test-model",
      parentSessionId: parent.id as number,
      soulId,
    });
    db.prepare(
      "UPDATE sessions SET cost_usd = 0.005, tokens_in = 50, tokens_out = 0, closed_at = ?, error = 'timeout' WHERE id = ?",
    ).run(Date.now(), s2.id);

    const evidence = gatherSoulEvidence(db, "JS Engineer");
    strictEqual(evidence.delegationStats.total, 2);
    strictEqual(evidence.delegationStats.completed, 1);
    strictEqual(evidence.delegationStats.failed, 1);
    ok(evidence.delegationStats.totalCostUsd > 0);
    ok(evidence.delegationStats.totalTokensIn > 0);
  });

  it("detects capacity when at trait limit", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS["js-engineer"];
    const existing = db
      .prepare("SELECT COUNT(*) AS c FROM soul_traits WHERE soul_id = ? AND status = 'active'")
      .get(soulId) as { c: number };

    for (let i = existing.c; i < 10; i++) {
      addTrait(db, soulId, {
        principle: `Test trait ${i}`,
        provenance: `Test provenance ${i}`,
      });
    }

    const evidence = gatherSoulEvidence(db, "JS Engineer");
    strictEqual(evidence.atCapacity, true);
  });

  it("includes reverted traits in evidence", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS.mentor;
    const trait = addTrait(db, soulId, {
      principle: "Test revertable",
      provenance: "Test provenance",
    });
    db.prepare("UPDATE soul_traits SET status = 'reverted', updated_at = ? WHERE id = ?").run(
      Date.now(),
      trait.id,
    );

    const evidence = gatherSoulEvidence(db, "Mentor");
    ok(evidence.revertedTraits.length >= 1);
    ok(evidence.revertedTraits.some((t) => t.principle === "Test revertable"));
  });
});

const DAY = 86_400_000;

function insertDelegation(
  db: DatabaseHandle,
  soulId: number,
  opts: { ageMs?: number; costUsd?: number; failed?: boolean },
): void {
  const ts = Date.now() - (opts.ageMs ?? 0);
  const key = `d:${ts}:${Math.random()}`;
  const parent = createSession(db, `p:${key}`, { purpose: "chat" });
  const s = createSession(db, key, {
    purpose: "delegate",
    model: "test-model",
    parentSessionId: parent.id as number,
    soulId,
  });
  const error = opts.failed ? "'tool_error'" : "NULL";
  db.prepare(
    `UPDATE sessions
     SET cost_usd = ?, tokens_in = 100, tokens_out = 50,
         closed_at = ?, created_at = ?, last_active_at = ?,
         error = ${error}
     WHERE id = ?`,
  ).run(opts.costUsd ?? 0.01, ts, ts, ts, s.id);
}

describe("windowed delegation stats", () => {
  it("separates recent from old delegations into windows", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS["js-engineer"];

    insertDelegation(db, soulId, { ageMs: 2 * DAY });
    insertDelegation(db, soulId, { ageMs: 2 * DAY });
    insertDelegation(db, soulId, { ageMs: 15 * DAY });
    insertDelegation(db, soulId, { ageMs: 60 * DAY });

    const evidence = gatherSoulEvidence(db, "JS Engineer");
    strictEqual(evidence.delegationStats.total, 4);

    const w7 = evidence.windowedStats.find((w) => w.window === "7d");
    ok(w7, "should have a 7d window");
    strictEqual(w7.stats.total, 2);

    const w30 = evidence.windowedStats.find((w) => w.window === "30d");
    ok(w30, "should have a 30d window");
    strictEqual(w30.stats.total, 3);
  });

  it("returns zeroed windows when no recent delegations exist", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS["js-engineer"];

    insertDelegation(db, soulId, { ageMs: 60 * DAY });

    const evidence = gatherSoulEvidence(db, "JS Engineer");
    const w7 = evidence.windowedStats.find((w) => w.window === "7d");
    ok(w7);
    strictEqual(w7.stats.total, 0);
    strictEqual(w7.stats.completed, 0);
  });

  it("includes since-last-trait-change window", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS["js-engineer"];

    const oldTs = Date.now() - 90 * DAY;
    db.prepare("UPDATE soul_traits SET created_at = ?, updated_at = ? WHERE soul_id = ?").run(
      oldTs,
      oldTs,
      soulId,
    );

    insertDelegation(db, soulId, { ageMs: 1 * DAY });
    insertDelegation(db, soulId, { ageMs: 60 * DAY });

    const traitTs = Date.now() - 3 * DAY;
    db.prepare(
      "INSERT INTO soul_traits (soul_id, principle, provenance, generation, status, created_at, updated_at) VALUES (?, 'test', 'test', 0, 'active', ?, ?)",
    ).run(soulId, traitTs, traitTs);

    const evidence = gatherSoulEvidence(db, "JS Engineer");
    const wTrait = evidence.windowedStats.find((w) => w.window === "since_last_trait_change");
    ok(wTrait, "should have since_last_trait_change window");
    strictEqual(wTrait.stats.total, 1);
  });
});

describe("trait fitness", () => {
  it("reports delegation stats since each active trait was added", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS["js-engineer"];

    const traitTs = Date.now() - 10 * DAY;
    const trait = addTrait(db, soulId, {
      principle: "Always verify API shapes",
      provenance: "Three runs failed from type mismatches",
    });
    db.prepare("UPDATE soul_traits SET created_at = ? WHERE id = ?").run(traitTs, trait.id);

    insertDelegation(db, soulId, { ageMs: 15 * DAY });
    insertDelegation(db, soulId, { ageMs: 5 * DAY });
    insertDelegation(db, soulId, { ageMs: 2 * DAY });

    const evidence = gatherSoulEvidence(db, "JS Engineer");
    const fitness = evidence.traitFitness.find((f) => f.traitId === trait.id);
    ok(fitness, "should have fitness entry for the added trait");
    strictEqual(fitness.statsSinceAdded.total, 2);
  });

  it("returns empty stats for a trait added after all delegations", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS["js-engineer"];

    insertDelegation(db, soulId, { ageMs: 30 * DAY });

    const trait = addTrait(db, soulId, {
      principle: "Fresh trait",
      provenance: "Just added",
    });

    const evidence = gatherSoulEvidence(db, "JS Engineer");
    const fitness = evidence.traitFitness.find((f) => f.traitId === trait.id);
    ok(fitness);
    strictEqual(fitness.statsSinceAdded.total, 0);
  });
});

describe("cost trend", () => {
  it("detects cheaper trend when recent costs are lower", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS["js-engineer"];

    insertDelegation(db, soulId, { ageMs: 10 * DAY, costUsd: 0.05 });
    insertDelegation(db, soulId, { ageMs: 10 * DAY, costUsd: 0.05 });
    insertDelegation(db, soulId, { ageMs: 2 * DAY, costUsd: 0.01 });
    insertDelegation(db, soulId, { ageMs: 2 * DAY, costUsd: 0.01 });

    const evidence = gatherSoulEvidence(db, "JS Engineer");
    strictEqual(evidence.costTrend.direction, "cheaper");
    ok(evidence.costTrend.recent7d < evidence.costTrend.previous7d);
  });

  it("detects costlier trend when recent costs are higher", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS["js-engineer"];

    insertDelegation(db, soulId, { ageMs: 10 * DAY, costUsd: 0.01 });
    insertDelegation(db, soulId, { ageMs: 2 * DAY, costUsd: 0.05 });

    const evidence = gatherSoulEvidence(db, "JS Engineer");
    strictEqual(evidence.costTrend.direction, "costlier");
  });

  it("returns stable with zeroed costs when no delegations exist", async () => {
    const db = await setup();
    const evidence = gatherSoulEvidence(db, "JS Engineer");
    strictEqual(evidence.costTrend.direction, "stable");
    strictEqual(evidence.costTrend.recent7d, 0);
    strictEqual(evidence.costTrend.previous7d, 0);
  });
});

describe("formatSoulEvidence", () => {
  it("produces readable markdown", async () => {
    const db = await setup();
    const evidence = gatherSoulEvidence(db, "Ghostpaw");
    const formatted = formatSoulEvidence(evidence);
    ok(formatted.includes("# Evidence Report: Ghostpaw"));
    ok(formatted.includes("Active traits:"));
    ok(formatted.includes("Delegation Performance"));
    ok(formatted.includes("## Essence"));
  });

  it("includes recent performance section with windowed stats", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS["js-engineer"];
    insertDelegation(db, soulId, { ageMs: 2 * DAY });

    const evidence = gatherSoulEvidence(db, "JS Engineer");
    const formatted = formatSoulEvidence(evidence);
    ok(formatted.includes("Recent Performance"));
    ok(formatted.includes("7d"));
  });

  it("includes trait effectiveness section", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS["js-engineer"];
    insertDelegation(db, soulId, { ageMs: 1 * DAY });

    const evidence = gatherSoulEvidence(db, "JS Engineer");
    const formatted = formatSoulEvidence(evidence);
    ok(formatted.includes("Trait Effectiveness"));
  });

  it("includes cost trend section", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS["js-engineer"];
    insertDelegation(db, soulId, { ageMs: 2 * DAY, costUsd: 0.01 });
    insertDelegation(db, soulId, { ageMs: 10 * DAY, costUsd: 0.05 });

    const evidence = gatherSoulEvidence(db, "JS Engineer");
    const formatted = formatSoulEvidence(evidence);
    ok(formatted.includes("Cost Trend"));
  });
});
