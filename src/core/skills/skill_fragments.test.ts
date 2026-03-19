import { deepStrictEqual, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import {
  fragmentCountsBySource,
  listFragments,
  pendingFragmentCount,
  pendingFragments,
} from "./api/read/fragments.ts";
import {
  absorbFragment,
  dropSkillFragment,
  enforceFragmentCap,
  expireStaleFragments,
} from "./api/write/fragments.ts";
import { initSkillFragmentsTables } from "./runtime/fragments.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initSkillFragmentsTables(db);
});

afterEach(() => {
  db.close();
});

describe("dropSkillFragment", () => {
  it("inserts a pending fragment", () => {
    dropSkillFragment(db, "quest", "q-1", "User prefers kebab-case imports", "typescript");
    const rows = db.prepare("SELECT * FROM skill_fragments").all();
    strictEqual(rows.length, 1);
    const row = rows[0] as Record<string, unknown>;
    strictEqual(row.source, "quest");
    strictEqual(row.source_id, "q-1");
    strictEqual(row.observation, "User prefers kebab-case imports");
    strictEqual(row.domain, "typescript");
    strictEqual(row.status, "pending");
    strictEqual(row.consumed_by, null);
  });

  it("handles null sourceId and domain", () => {
    dropSkillFragment(db, "historian", null, "Retry patterns observed");
    const row = db.prepare("SELECT * FROM skill_fragments").get() as Record<string, unknown>;
    strictEqual(row.source_id, null);
    strictEqual(row.domain, null);
  });
});

describe("pendingFragments", () => {
  it("returns only pending fragments", () => {
    dropSkillFragment(db, "quest", "q-1", "obs 1");
    dropSkillFragment(db, "session", "s-1", "obs 2");
    absorbFragment(db, 1, "deploy");
    const frags = pendingFragments(db);
    strictEqual(frags.length, 1);
    strictEqual(frags[0].observation, "obs 2");
  });

  it("filters by domain when provided", () => {
    dropSkillFragment(db, "quest", "q-1", "deploy obs", "deployment");
    dropSkillFragment(db, "quest", "q-2", "test obs", "testing");
    const frags = pendingFragments(db, "deployment");
    strictEqual(frags.length, 1);
    strictEqual(frags[0].observation, "deploy obs");
  });

  it("returns empty array when no pending fragments", () => {
    deepStrictEqual(pendingFragments(db), []);
  });
});

describe("pendingFragmentCount", () => {
  it("returns correct count", () => {
    strictEqual(pendingFragmentCount(db), 0);
    dropSkillFragment(db, "quest", null, "obs 1");
    dropSkillFragment(db, "quest", null, "obs 2");
    strictEqual(pendingFragmentCount(db), 2);
  });
});

describe("absorbFragment", () => {
  it("marks fragment as absorbed with consuming skill", () => {
    dropSkillFragment(db, "quest", "q-1", "obs");
    absorbFragment(db, 1, "deploy-vercel");
    const row = db
      .prepare("SELECT status, consumed_by FROM skill_fragments WHERE id = 1")
      .get() as Record<string, unknown>;
    strictEqual(row.status, "absorbed");
    strictEqual(row.consumed_by, "deploy-vercel");
  });
});

describe("expireStaleFragments", () => {
  it("expires fragments older than threshold", () => {
    db.prepare(
      "INSERT INTO skill_fragments (source, observation, status, created_at) VALUES (?, ?, 'pending', ?)",
    ).run("quest", "old obs", Math.floor(Date.now() / 1000) - 91 * 86400);
    dropSkillFragment(db, "quest", null, "fresh obs");

    expireStaleFragments(db, 90);
    strictEqual(pendingFragmentCount(db), 1);
    const frags = pendingFragments(db);
    strictEqual(frags[0].observation, "fresh obs");
  });
});

describe("listFragments", () => {
  it("returns pending and absorbed fragments excluding expired", () => {
    dropSkillFragment(db, "quest", "q-1", "obs 1");
    dropSkillFragment(db, "session", "s-1", "obs 2");
    absorbFragment(db, 1, "deploy");
    const frags = listFragments(db);
    strictEqual(frags.length, 2);
    const statuses = frags.map((f) => f.status);
    strictEqual(statuses.includes("absorbed"), true);
    strictEqual(statuses.includes("pending"), true);
  });

  it("filters by status when provided", () => {
    dropSkillFragment(db, "quest", null, "obs 1");
    dropSkillFragment(db, "quest", null, "obs 2");
    absorbFragment(db, 1, "deploy");
    const absorbed = listFragments(db, { status: "absorbed" });
    strictEqual(absorbed.length, 1);
    strictEqual(absorbed[0].consumedBy, "deploy");
  });

  it("respects limit", () => {
    for (let i = 0; i < 5; i++) dropSkillFragment(db, "quest", null, `obs ${i}`);
    const frags = listFragments(db, { limit: 2 });
    strictEqual(frags.length, 2);
  });

  it("excludes expired fragments by default", () => {
    db.prepare(
      "INSERT INTO skill_fragments (source, observation, status, created_at) VALUES (?, ?, 'pending', ?)",
    ).run("quest", "old obs", Math.floor(Date.now() / 1000) - 100 * 86400);
    expireStaleFragments(db, 90);
    const frags = listFragments(db);
    strictEqual(frags.length, 0);
  });
});

describe("fragmentCountsBySource", () => {
  it("groups counts by source and status", () => {
    dropSkillFragment(db, "quest", "q-1", "obs 1");
    dropSkillFragment(db, "quest", "q-2", "obs 2");
    dropSkillFragment(db, "session", "s-1", "obs 3");
    absorbFragment(db, 1, "deploy");

    const counts = fragmentCountsBySource(db);
    strictEqual(counts.quest?.pending, 1);
    strictEqual(counts.quest?.absorbed, 1);
    strictEqual(counts.session?.pending, 1);
    strictEqual(counts.session?.absorbed, 0);
  });

  it("returns empty object when no fragments", () => {
    const counts = fragmentCountsBySource(db);
    deepStrictEqual(counts, {});
  });
});

describe("enforceFragmentCap", () => {
  it("expires oldest fragments beyond cap", () => {
    for (let i = 0; i < 5; i++) {
      dropSkillFragment(db, "quest", null, `obs ${i}`);
    }
    enforceFragmentCap(db, 3);
    strictEqual(pendingFragmentCount(db), 3);
    const frags = pendingFragments(db);
    strictEqual(frags[0].observation, "obs 2");
    strictEqual(frags[2].observation, "obs 4");
  });

  it("does nothing when under cap", () => {
    dropSkillFragment(db, "quest", null, "obs");
    enforceFragmentCap(db, 50);
    strictEqual(pendingFragmentCount(db), 1);
  });
});
