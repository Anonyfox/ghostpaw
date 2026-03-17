import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { initChatTables } from "../../core/chat/runtime/index.ts";
import { completeQuest, createQuest, updateQuest } from "../../core/quests/api/write/index.ts";
import { initQuestTables } from "../../core/quests/runtime/index.ts";
import { initSkillFragmentsTables } from "../../core/skills/runtime/index.ts";
import { dropSoulshard } from "../../core/souls/api/write/index.ts";
import { initSoulShardTables, initSoulsTables } from "../../core/souls/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { executeTurnIn } from "./turn_in.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
  initChatTables(db);
  initSoulsTables(db);
  initSoulShardTables(db);
  initSkillFragmentsTables(db);
  const now = Date.now();
  db.prepare(
    "INSERT INTO souls (id, name, essence, description, level, created_at, updated_at) VALUES (?, ?, '', '', 0, ?, ?)",
  ).run(1, "Ghostpaw", now, now);
});

describe("executeTurnIn", () => {
  it("reveals sealed shards, drops fragment, and transitions status", () => {
    const q = createQuest(db, { title: "Build feature" });
    completeQuest(db, q.id);

    dropSoulshard(db, "quest", String(q.id), "Pattern A", [1], true);
    dropSoulshard(db, "quest", String(q.id), "Pattern B", [1], true);

    const summary = executeTurnIn(db, q.id);

    strictEqual(summary.quest.status, "turned_in");
    strictEqual(summary.revealedShards, 2);
    strictEqual(summary.fragmentDropped, true);
    strictEqual(summary.xpEarned, 0);
    strictEqual(summary.narrative, null);

    const sealed = db.prepare("SELECT COUNT(*) AS cnt FROM soul_shards WHERE sealed = 1").get() as {
      cnt: number;
    };
    strictEqual(sealed.cnt, 0);
  });

  it("works with no sealed shards", () => {
    const q = createQuest(db, { title: "Quick fix" });
    completeQuest(db, q.id);

    const summary = executeTurnIn(db, q.id);

    strictEqual(summary.quest.status, "turned_in");
    strictEqual(summary.revealedShards, 0);
    strictEqual(summary.fragmentDropped, true);
  });

  it("includes XP from linked sessions", () => {
    const q = createQuest(db, { title: "With XP" });
    completeQuest(db, q.id);

    const now = Date.now();
    db.prepare(
      "INSERT INTO sessions (key, purpose, quest_id, created_at, last_active_at, xp_earned, closed_at) VALUES ('test-key', 'quest', ?, ?, ?, 42.5, ?)",
    ).run(q.id, now - 60_000, now, now);

    const summary = executeTurnIn(db, q.id);
    ok(summary.xpEarned >= 42.5);
  });

  it("includes pre-computed narrative in summary", () => {
    const q = createQuest(db, { title: "Narrated" });
    completeQuest(db, q.id);
    updateQuest(db, q.id, { turnInNarrative: "Great work on the feature." });

    const summary = executeTurnIn(db, q.id);
    strictEqual(summary.narrative, "Great work on the feature.");
  });

  it("still drops fragment when shards exist from other quests", () => {
    const q1 = createQuest(db, { title: "Quest A" });
    const q2 = createQuest(db, { title: "Quest B" });
    completeQuest(db, q1.id);
    completeQuest(db, q2.id);

    dropSoulshard(db, "quest", String(q2.id), "Other quest", [1], true);

    const summary = executeTurnIn(db, q1.id);
    strictEqual(summary.revealedShards, 0);
    strictEqual(summary.fragmentDropped, true);

    const stillSealed = db
      .prepare("SELECT COUNT(*) AS cnt FROM soul_shards WHERE sealed = 1")
      .get() as { cnt: number };
    strictEqual(stillSealed.cnt, 1);
  });
});
