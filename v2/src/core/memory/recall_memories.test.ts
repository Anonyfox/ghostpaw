import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { embedText } from "./embed_text.ts";
import { recallMemories } from "./recall_memories.ts";
import { initMemoryTable } from "./schema.ts";
import { storeMemory } from "./store_memory.ts";

describe("recallMemories", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initMemoryTable(db);
  });

  afterEach(() => db.close());

  it("returns results from Phase 1 when sufficient", () => {
    for (let i = 0; i < 5; i++) {
      storeMemory(db, `The user likes pizza variant ${i}`, embedText(`pizza variant ${i}`), {
        source: "explicit",
      });
    }
    const results = recallMemories(db, "pizza", { fallbackMinResults: 3 });
    ok(results.length >= 3);
  });

  it("triggers FTS fallback when Phase 1 returns too few results", () => {
    storeMemory(db, "The deployment process uses docker compose up", embedText("deploy docker"), {
      source: "explicit",
    });
    const results = recallMemories(db, "deployment process docker", {
      fallbackMinResults: 3,
      fallbackThreshold: 0.99,
    });
    ok(results.length >= 1);
    ok(results[0].claim.includes("deployment"));
  });

  it("finds buried old memories via FTS that Phase 1 pre-ranking excludes", () => {
    const buried = storeMemory(
      db,
      "The secret API key is stored in the vault",
      embedText("The secret API key is stored in the vault"),
      { source: "explicit" },
    );
    const oldTime = Date.now() - 60 * 86_400_000;
    db.prepare("UPDATE memories SET created_at = ?, verified_at = ? WHERE id = ?").run(
      oldTime,
      oldTime,
      buried.id,
    );

    for (let i = 0; i < 20; i++) {
      storeMemory(
        db,
        `Recent cooking recipe ${i} with garlic and herbs`,
        embedText(`cooking recipe ${i} garlic herbs`),
        { source: "explicit" },
      );
    }

    const results = recallMemories(db, "secret API key vault", {
      k: 15,
      candidateMultiplier: 1,
      fallbackThreshold: 0.99,
      fallbackMinResults: 15,
    });
    ok(results.some((r) => r.claim.includes("API key")));
  });

  it("deduplicates results across Phase 1 and Phase 2", () => {
    storeMemory(db, "The user likes pizza", embedText("The user likes pizza"), {
      source: "explicit",
    });
    const results = recallMemories(db, "pizza", {
      fallbackThreshold: 0.99,
      fallbackMinResults: 10,
    });
    const ids = results.map((r) => r.id);
    const unique = new Set(ids);
    strictEqual(ids.length, unique.size);
  });

  it("returns RankedMemory objects with score and similarity", () => {
    storeMemory(db, "The user prefers dark mode", embedText("dark mode preference"), {
      source: "explicit",
    });
    const results = recallMemories(db, "dark mode");
    ok(results.length >= 1);
    strictEqual(typeof results[0].score, "number");
    strictEqual(typeof results[0].similarity, "number");
    strictEqual(typeof results[0].id, "number");
    strictEqual(typeof results[0].claim, "string");
    strictEqual(typeof results[0].confidence, "number");
  });

  it("returns empty array when nothing matches at all", () => {
    const results = recallMemories(db, "quantum chromodynamics");
    strictEqual(results.length, 0);
  });

  it("skips FTS for very short queries that produce no FTS tokens", () => {
    storeMemory(db, "Short test", embedText("Short test"), { source: "explicit" });
    const results = recallMemories(db, "I", { fallbackMinResults: 10 });
    strictEqual(results.length, 0);
  });

  it("respects k limit in merged results", () => {
    for (let i = 0; i < 20; i++) {
      storeMemory(db, `Pizza fact ${i} about toppings`, embedText(`pizza toppings ${i}`), {
        source: "explicit",
      });
    }
    const results = recallMemories(db, "pizza toppings", { k: 5 });
    ok(results.length <= 5);
  });

  it("merged results are sorted by score descending", () => {
    storeMemory(db, "User loves pizza very much", embedText("pizza very much"), {
      source: "explicit",
    });
    storeMemory(db, "User also likes sushi sometimes", embedText("sushi sometimes"), {
      source: "inferred",
    });
    const results = recallMemories(db, "pizza sushi food", {
      fallbackThreshold: 0.99,
      fallbackMinResults: 10,
    });
    for (let i = 1; i < results.length; i++) {
      ok(results[i - 1].score >= results[i].score);
    }
  });
});
