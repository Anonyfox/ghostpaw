import assert from "node:assert";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { read, write } from "@ghostpaw/affinity";
import { Chat, Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import type { RuntimeContext, SoulIds } from "../../runtime.ts";
import { openMemoryAffinityDatabase } from "../db/open_affinity.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { openMemorySoulsDatabase } from "../db/open_souls.ts";
import { bootstrapSouls } from "../souls/bootstrap.ts";
import { runTend } from "./tend.ts";

function patchChatStream(response: string): void {
  mock.method(Chat.prototype, "stream", async function* stream(this: Chat) {
    this.addMessage(new Message("assistant", response));
    yield response;
  });
}

type AffinityDb = Parameters<typeof read.listDuplicateCandidates>[0];

function asAffinity(db: DatabaseHandle): AffinityDb {
  return db as unknown as AffinityDb;
}

function createTwoSarahs(affinityDb: AffinityDb): { leftId: number; rightId: number } {
  const left = write.createContact(affinityDb, { name: "Sarah", kind: "human" });
  const right = write.createContact(affinityDb, { name: "Sarah Chen", kind: "human" });
  return { leftId: left.primary.id, rightId: right.primary.id };
}

let db: DatabaseHandle;
let affinityDb: DatabaseHandle;
let soulsDb: DatabaseHandle;
let soulIds: SoulIds;
let ctx: RuntimeContext;

beforeEach(async () => {
  db = openMemoryDatabase();
  affinityDb = await openMemoryAffinityDatabase();
  soulsDb = openMemorySoulsDatabase();
  soulIds = bootstrapSouls(soulsDb);
  ctx = {
    homePath: "/tmp/test",
    workspace: "/tmp/test",
    db,
    codexDb: db,
    affinityDb,
    soulsDb,
    config: {
      model: "test-model",
      model_small: "test-model-small",
    },
    soulIds,
  } as RuntimeContext;
});

afterEach(() => {
  soulsDb.close();
  affinityDb.close();
  db.close();
  mock.restoreAll();
});

describe("runTend — Phase 1 (zero-token gate)", () => {
  it("returns maintenance with zero counts when no contacts exist", async () => {
    const signal = new AbortController().signal;
    const result = await runTend(ctx, signal);

    assert.strictEqual(result.phase, "maintenance");
    assert.strictEqual(result.duplicates, 0);
    assert.strictEqual(result.driftItems, 0);
    assert.strictEqual(result.rounds, 0);
    assert.strictEqual(result.sessionId, undefined);
  });

  it("returns maintenance when signal is already aborted", async () => {
    const aDb = asAffinity(affinityDb);
    createTwoSarahs(aDb);

    const ac = new AbortController();
    ac.abort();
    const result = await runTend(ctx, ac.signal);

    assert.strictEqual(result.phase, "maintenance");
    assert.strictEqual(result.rounds, 0);
    assert.strictEqual(result.sessionId, undefined);
  });
});

describe("runTend — Phase 2 (LLM session)", () => {
  it("creates an innkeeper session when duplicate candidates exist", async () => {
    patchChatStream("[innkeeper] Reviewed duplicates. No merges needed.");
    const aDb = asAffinity(affinityDb);
    createTwoSarahs(aDb);

    const signal = new AbortController().signal;
    const result = await runTend(ctx, signal);

    assert.strictEqual(result.phase, "resolution");
    assert.ok(result.duplicates > 0);
    assert.strictEqual(result.rounds, 1);
    assert.strictEqual(typeof result.sessionId, "number");
    assert.ok(result.sessionId! > 0);
    assert.strictEqual(result.succeeded, true);
  });

  it("session has purpose=pulse and soul_id=innkeeper", async () => {
    patchChatStream("[innkeeper] No merges needed.");
    const aDb = asAffinity(affinityDb);
    createTwoSarahs(aDb);

    const signal = new AbortController().signal;
    const result = await runTend(ctx, signal);

    assert.ok(result.sessionId);
    const session = db
      .prepare("SELECT purpose, soul_id FROM sessions WHERE id = ?")
      .get(result.sessionId) as { purpose: string; soul_id: number };

    assert.strictEqual(session.purpose, "pulse");
    assert.strictEqual(session.soul_id, soulIds.innkeeper);
  });

  it("seals the session tail after the turn", async () => {
    patchChatStream("[innkeeper] Reviewed.");
    const aDb = asAffinity(affinityDb);
    createTwoSarahs(aDb);

    const signal = new AbortController().signal;
    const result = await runTend(ctx, signal);

    assert.ok(result.sessionId);
    const sealed = db
      .prepare("SELECT COUNT(*) as c FROM messages WHERE session_id = ? AND sealed_at IS NOT NULL")
      .get(result.sessionId) as { c: number };

    assert.ok(sealed.c > 0, "session should have sealed messages");
  });

  it("seals session even when LLM turn fails", async () => {
    mock.method(Chat.prototype, "stream", async function* stream(this: Chat) {
      yield "";
      throw new Error("API timeout");
    });
    const aDb = asAffinity(affinityDb);
    createTwoSarahs(aDb);

    const signal = new AbortController().signal;
    const result = await runTend(ctx, signal);

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.rounds, 1);
    assert.ok(result.sessionId);
    const sealed = db
      .prepare("SELECT COUNT(*) as c FROM messages WHERE session_id = ? AND sealed_at IS NOT NULL")
      .get(result.sessionId) as { c: number };

    assert.ok(sealed.c > 0);
  });
});

describe("runTend — Phase 3 (auto-dismissal)", () => {
  it("dismisses unmerged candidates after successful session", async () => {
    patchChatStream("[innkeeper] Reviewed. Not duplicates.");
    const aDb = asAffinity(affinityDb);
    const { leftId, rightId } = createTwoSarahs(aDb);

    const signal = new AbortController().signal;
    const result = await runTend(ctx, signal);

    assert.strictEqual(result.succeeded, true);
    assert.ok(result.dismissedCount! > 0, "should have dismissed at least one pair");

    const dismissed = read.listDismissedDuplicates(aDb);
    const found = dismissed.some(
      (d) =>
        (d.leftContactId === leftId && d.rightContactId === rightId) ||
        (d.leftContactId === rightId && d.rightContactId === leftId),
    );
    assert.ok(found, "dismissed pair should exist in affinity DB");
  });

  it("dismissed pairs are excluded on the next run", async () => {
    patchChatStream("[innkeeper] Reviewed.");
    const aDb = asAffinity(affinityDb);
    createTwoSarahs(aDb);

    const signal = new AbortController().signal;
    await runTend(ctx, signal);

    const result2 = await runTend(ctx, signal);
    assert.strictEqual(result2.phase, "maintenance");
    assert.strictEqual(result2.duplicates, 0);
    assert.strictEqual(result2.rounds, 0);
    assert.strictEqual(result2.sessionId, undefined);
  });

  it("does not dismiss when LLM turn fails", async () => {
    mock.method(Chat.prototype, "stream", async function* stream(this: Chat) {
      yield "";
      throw new Error("API timeout");
    });
    const aDb = asAffinity(affinityDb);
    createTwoSarahs(aDb);

    const signal = new AbortController().signal;
    const result = await runTend(ctx, signal);

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.dismissedCount, undefined);

    const dismissed = read.listDismissedDuplicates(aDb);
    assert.strictEqual(dismissed.length, 0, "no dismissals after failed session");
  });
});

describe("runTend — drain loop", () => {
  it("drains multiple batches in a single runTend call", async () => {
    patchChatStream("[innkeeper] Reviewed batch.");
    const aDb = asAffinity(affinityDb);

    for (let i = 0; i < 6; i++) {
      write.createContact(aDb, { name: "Sarah", kind: "human" });
    }

    const totalBefore = read.listDuplicateCandidates(aDb).length;
    assert.ok(totalBefore > 10, `expected >10 candidate pairs, got ${totalBefore}`);

    const signal = new AbortController().signal;
    const result = await runTend(ctx, signal);

    assert.strictEqual(result.phase, "resolution");
    assert.ok(result.rounds >= 2, `expected >=2 rounds, got ${result.rounds}`);
    assert.strictEqual(result.succeeded, true);
    assert.ok(result.dismissedCount! > 10, "should have dismissed more than one batch");

    const remaining = read.listDuplicateCandidates(aDb);
    assert.strictEqual(remaining.length, 0, "no candidates should remain after drain");
  });

  it("caps at MAX_ROUNDS even with remaining candidates", async () => {
    patchChatStream("[innkeeper] Reviewed batch.");
    const aDb = asAffinity(affinityDb);

    for (let i = 0; i < 12; i++) {
      write.createContact(aDb, { name: "Sarah", kind: "human" });
    }

    const totalBefore = read.listDuplicateCandidates(aDb).length;
    assert.ok(totalBefore > 30, `expected >30 candidate pairs for 12 contacts, got ${totalBefore}`);

    const signal = new AbortController().signal;
    const result = await runTend(ctx, signal);

    assert.strictEqual(result.rounds, 3);
    assert.strictEqual(result.dismissedCount, 30);

    const remaining = read.listDuplicateCandidates(aDb);
    assert.ok(remaining.length > 0, "some candidates should remain after capped rounds");
  });
});
