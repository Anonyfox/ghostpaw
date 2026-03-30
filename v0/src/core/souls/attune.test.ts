import assert from "node:assert";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { read, type SoulsDb, write } from "@ghostpaw/souls";
import { Chat, Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import type { RuntimeContext, SoulIds } from "../../runtime.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { openMemorySoulsDatabase } from "../db/open_souls.ts";
import { runAttune } from "./attune.ts";
import { bootstrapSouls } from "./bootstrap.ts";

const MS_PER_DAY = 86_400_000;

/**
 * Deposits shards with timestamps spread across 3 days and varied content/sources
 * to satisfy all crystallization criteria (count, diversity, age spread, clusters).
 */
const DIVERSE_CONTENTS = [
  "Agent abandoned initial approach after detecting circular reasoning and pivoted to a fresh decomposition strategy.",
  "Consistently deferred to user on ambiguous requirements rather than making assumptions about intent.",
  "Used precise technical vocabulary from database theory when explaining query optimization to the user.",
  "Generated three alternative architectures before settling on the simplest one that met all constraints.",
  "Recovered gracefully from an API timeout by caching partial results and resuming from checkpoint.",
  "Spontaneously offered a security review of the proposed configuration without being asked.",
  "Applied functional programming patterns to a problem that was initially framed imperatively.",
  "Noticed contradictory requirements in the spec and flagged them before starting implementation.",
  "Produced unusually concise code by extracting a reusable abstraction from repeated patterns.",
  "Hallucinated a nonexistent API method and self-corrected after checking documentation.",
  "Spent disproportionate time on error handling edge cases, resulting in robust but verbose code.",
  "Asked clarifying questions about deployment environment before recommending a solution approach.",
  "Demonstrated deep knowledge of cryptographic primitives when reviewing authentication flow.",
  "Refused to implement a feature that would violate data privacy regulations, explaining the legal risk.",
  "Rewrote the entire solution mid-stream when realizing the initial design would not scale.",
];

function depositReadyShards(sDb: DatabaseHandle, soulId: number, count = 10): void {
  const baseTime = Date.now() - 3 * MS_PER_DAY;
  const db = sDb as unknown as SoulsDb;
  for (let i = 0; i < count; i++) {
    write.dropShard(db, {
      content: DIVERSE_CONTENTS[i % DIVERSE_CONTENTS.length],
      source: `source-${i % 4}`,
      soulIds: [soulId],
      now: baseTime + (i * (2 * MS_PER_DAY)) / count,
    });
  }
}

function patchChatStream(response: string): void {
  mock.method(Chat.prototype, "stream", async function* stream(this: Chat) {
    this.addMessage(new Message("assistant", response));
    yield response;
  });
}

let db: DatabaseHandle;
let soulsDb: DatabaseHandle;
let soulIds: SoulIds;
let ctx: RuntimeContext;

beforeEach(() => {
  db = openMemoryDatabase();
  soulsDb = openMemorySoulsDatabase();
  soulIds = bootstrapSouls(soulsDb);
  ctx = {
    homePath: "/tmp/test",
    workspace: "/tmp/test",
    db,
    codexDb: db,
    affinityDb: db,
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
  db.close();
  mock.restoreAll();
});

describe("runAttune — Phase 1 (no ready souls)", () => {
  it("returns maintenance phase with zero ready souls when no shards exist", async () => {
    const signal = new AbortController().signal;
    const result = await runAttune(ctx, signal);

    assert.strictEqual(result.phase, "maintenance");
    assert.strictEqual(result.readySoulsCount, 0);
    assert.strictEqual(result.soulId, undefined);
    assert.strictEqual(result.sessionId, undefined);
  });

  it("reports faded shard count from maintenance", async () => {
    const signal = new AbortController().signal;
    const result = await runAttune(ctx, signal);

    assert.strictEqual(typeof result.fadedShardCount, "number");
  });
});

describe("runAttune — Phase 1 (aborted before Phase 2)", () => {
  it("returns maintenance phase if signal is aborted", async () => {
    const ac = new AbortController();
    depositReadyShards(soulsDb, soulIds.ghostpaw);

    ac.abort();
    const result = await runAttune(ctx, ac.signal);

    assert.strictEqual(result.phase, "maintenance");
    assert.strictEqual(result.sessionId, undefined);
  });
});

describe("runAttune — Phase 2 (refinement)", () => {
  it("creates a mentor session and executes a turn when shards are ready", async () => {
    patchChatStream("I have reviewed the evidence. No changes needed at this time.");
    depositReadyShards(soulsDb, soulIds.ghostpaw);

    const signal = new AbortController().signal;
    const result = await runAttune(ctx, signal);

    assert.strictEqual(result.phase, "refinement");
    assert.strictEqual(result.soulId, soulIds.ghostpaw);
    assert.strictEqual(typeof result.sessionId, "number");
    assert.ok(result.sessionId! > 0);
    assert.strictEqual(result.succeeded, true);
  });

  it("session has purpose=pulse and soul_id=mentor", async () => {
    patchChatStream("No changes needed.");
    depositReadyShards(soulsDb, soulIds.scribe);

    const signal = new AbortController().signal;
    const result = await runAttune(ctx, signal);

    assert.ok(result.sessionId);
    const session = db
      .prepare("SELECT purpose, soul_id FROM sessions WHERE id = ?")
      .get(result.sessionId) as { purpose: string; soul_id: number };

    assert.strictEqual(session.purpose, "pulse");
    assert.strictEqual(session.soul_id, soulIds.mentor);
  });

  it("seals the session tail after the turn", async () => {
    patchChatStream("Reviewed evidence. Passed.");
    depositReadyShards(soulsDb, soulIds.ghostpaw);

    const signal = new AbortController().signal;
    const result = await runAttune(ctx, signal);

    assert.ok(result.sessionId);
    const sealed = db
      .prepare("SELECT COUNT(*) as c FROM messages WHERE session_id = ? AND sealed_at IS NOT NULL")
      .get(result.sessionId) as { c: number };

    assert.ok(sealed.c > 0, "session should have sealed messages");
  });

  it("stamps the soul as attuned after refinement", async () => {
    patchChatStream("No changes needed.");
    depositReadyShards(soulsDb, soulIds.ghostpaw);

    const signal = new AbortController().signal;
    await runAttune(ctx, signal);

    const soul = read.getSoul(soulsDb as unknown as SoulsDb, soulIds.ghostpaw);
    assert.ok(soul?.lastAttunedAt, "soul should have lastAttunedAt after attunement");
    assert.ok(soul!.lastAttunedAt! > 0);
  });

  it("picks the highest priority soul when multiple are ready", async () => {
    patchChatStream("Reviewed.");
    depositReadyShards(soulsDb, soulIds.ghostpaw);
    depositReadyShards(soulsDb, soulIds.scribe, 15);

    const signal = new AbortController().signal;
    const result = await runAttune(ctx, signal);

    assert.strictEqual(result.phase, "refinement");
    assert.ok(result.readySoulsCount >= 2, "should have multiple ready souls");
  });

  it("does not stamp attuned when the LLM turn fails", async () => {
    mock.method(Chat.prototype, "stream", async function* stream(this: Chat) {
      yield "";
      throw new Error("API timeout");
    });
    depositReadyShards(soulsDb, soulIds.ghostpaw);

    const signal = new AbortController().signal;
    const result = await runAttune(ctx, signal);

    assert.strictEqual(result.phase, "refinement");
    assert.strictEqual(result.succeeded, false);
    const soul = read.getSoul(soulsDb as unknown as SoulsDb, soulIds.ghostpaw);
    assert.strictEqual(soul?.lastAttunedAt, null, "soul must NOT be stamped after a failed turn");
  });

  it("seals the session even when the LLM turn fails", async () => {
    mock.method(Chat.prototype, "stream", async function* stream(this: Chat) {
      yield "";
      throw new Error("API timeout");
    });
    depositReadyShards(soulsDb, soulIds.ghostpaw);

    const signal = new AbortController().signal;
    const result = await runAttune(ctx, signal);

    assert.ok(result.sessionId);
    const sealed = db
      .prepare("SELECT COUNT(*) as c FROM messages WHERE session_id = ? AND sealed_at IS NOT NULL")
      .get(result.sessionId) as { c: number };
    assert.ok(sealed.c > 0, "session should have sealed messages even after failure");
  });
});
