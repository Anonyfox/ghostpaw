import { deepStrictEqual, ok, strictEqual, throws } from "node:assert";
import { describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession, initChatTables } from "../chat/index.ts";
import { initConfigTable } from "../config/index.ts";
import { initMemoryTable } from "../memory/index.ts";
import {
  addTrait,
  ensureMandatorySouls,
  formatSoulEvidence,
  gatherSoulEvidence,
  initSoulsTables,
  MANDATORY_SOUL_IDS,
} from "./index.ts";

async function setup(): Promise<DatabaseHandle> {
  const db = await openTestDatabase();
  initSoulsTables(db);
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
});
