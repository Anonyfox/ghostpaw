import assert from "node:assert";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { Chat, Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { addMessage } from "../chat/messages.ts";
import { createSession } from "../chat/session.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { openMemorySoulsDatabase } from "../db/open_souls.ts";
import { bootstrapSouls } from "../souls/bootstrap.ts";
import { parseShardTexts, runShardsProcessor } from "./shards.ts";
import { writeImpression } from "./write_impression.ts";

function patchChatGenerate(response: string): void {
  mock.method(Chat.prototype, "generate", async function generate(this: Chat) {
    this.addMessage(new Message("assistant", response));
    return response;
  });
}

let db: DatabaseHandle;
let soulsDb: DatabaseHandle;
let ghostpawId: number;

beforeEach(() => {
  db = openMemoryDatabase();
  soulsDb = openMemorySoulsDatabase();
  const soulIds = bootstrapSouls(soulsDb);
  ghostpawId = soulIds.ghostpaw;
});

afterEach(() => {
  db.close();
  soulsDb.close();
  mock.restoreAll();
});

function seedImpression(soulId: number): void {
  const session = createSession(db, "m", "p", { purpose: "chat", soulId });
  const msgId = addMessage(db, session.id, "user", "hello");
  writeImpression(db, {
    sessionId: session.id,
    sealedMsgId: msgId,
    soulId,
    impressions: "Agent showed good judgment.\n\nResponse was precise and well-reasoned.",
    impressionCount: 2,
    ingestSessionId: null,
  });
}

describe("parseShardTexts", () => {
  it("returns empty array for (none)", () => {
    assert.deepStrictEqual(parseShardTexts("(none)"), []);
    assert.deepStrictEqual(parseShardTexts("  (none)  "), []);
  });

  it("filters out parenthetical near-misses like (one), (something)", () => {
    const output =
      "(one)\n\nThe agent showed a systematic bias toward caution when handling identity conflicts.\n\n(something)";
    const result = parseShardTexts(output);
    assert.strictEqual(result.length, 1);
    assert.ok(result[0].includes("systematic bias"));
  });

  it("filters out bracket labels like [scribe], [note]", () => {
    const output =
      "[scribe] Nothing noteworthy this turn.\n\nThe agent proactively restructured ambiguous input before processing it.";
    const result = parseShardTexts(output);
    assert.strictEqual(result.length, 1);
    assert.ok(result[0].includes("proactively restructured"));
  });

  it("filters out markdown headers", () => {
    const output =
      "# Shard the agent captured identities without reconciling ambiguity showing breadth over validation.\n\nThe agent defaulted to creating separate contacts rather than resolving ambiguity through search.";
    const result = parseShardTexts(output);
    assert.strictEqual(result.length, 1);
    assert.ok(result[0].includes("defaulted to creating"));
  });

  it("filters out shards shorter than 50 characters", () => {
    const output = "Too short.\n\nThe agent demonstrated careful disambiguation when multiple contacts shared similar names.";
    const result = parseShardTexts(output);
    assert.strictEqual(result.length, 1);
    assert.ok(result[0].includes("careful disambiguation"));
  });

  it("keeps valid shards that meet all criteria", () => {
    const output =
      "The agent showed a consistent preference for creating new records over merging existing ones.\n\nA clear bias toward preserving ambiguity emerged when handling overlapping identities.";
    const result = parseShardTexts(output);
    assert.strictEqual(result.length, 2);
  });

  it("filters out blockquote fragments", () => {
    const output =
      "> Some quoted text from the agent about identity.\n\nThe agent consistently chose breadth over depth when storing contact attributes.";
    const result = parseShardTexts(output);
    assert.strictEqual(result.length, 1);
    assert.ok(result[0].includes("breadth over depth"));
  });

  it("filters (none) paragraphs from mixed output", () => {
    const output =
      "(none)\n\nThe agent preserved ambiguous identities instead of auto-merging when names partially overlapped.";
    const result = parseShardTexts(output);
    assert.strictEqual(result.length, 1);
    assert.ok(result[0].includes("preserved ambiguous"));
  });
});

describe("runShardsProcessor", () => {
  it("returns zero processed when no impressions exist", async () => {
    patchChatGenerate("(none)");
    const result = await runShardsProcessor(
      db,
      soulsDb,
      "test-model",
      new AbortController().signal,
    );
    assert.strictEqual(result.processed, 0);
    assert.strictEqual(result.errors, 0);
  });

  it("processes an impression and deposits shards with correct content", async () => {
    patchChatGenerate(
      "The agent demonstrated unusual precision when analyzing ambiguous requirements.\n\nThe agent showed initiative beyond explicit task scope by restructuring inputs.",
    );
    seedImpression(ghostpawId);

    const result = await runShardsProcessor(
      db,
      soulsDb,
      "test-model",
      new AbortController().signal,
    );
    assert.strictEqual(result.processed, 1);
    assert.strictEqual(result.errors, 0);

    const shards = soulsDb
      .prepare("SELECT content, source FROM soul_shards WHERE source = 'shade' ORDER BY id")
      .all() as Array<{ content: string; source: string }>;
    assert.strictEqual(shards.length, 2);
    assert.strictEqual(
      shards[0].content,
      "The agent demonstrated unusual precision when analyzing ambiguous requirements.",
    );
    assert.strictEqual(
      shards[1].content,
      "The agent showed initiative beyond explicit task scope by restructuring inputs.",
    );
  });

  it("handles (none) response — no shards deposited", async () => {
    patchChatGenerate("(none)");
    seedImpression(ghostpawId);

    const result = await runShardsProcessor(
      db,
      soulsDb,
      "test-model",
      new AbortController().signal,
    );
    assert.strictEqual(result.processed, 1);

    const shardCount = (
      soulsDb.prepare("SELECT COUNT(*) as c FROM soul_shards").get() as { c: number }
    ).c;
    assert.strictEqual(shardCount, 0);
  });

  it("creates a shade-purpose session for the processor oneshot", async () => {
    patchChatGenerate("The agent created parallel contact records instead of merging under ambiguity.");
    seedImpression(ghostpawId);

    await runShardsProcessor(db, soulsDb, "test-model", new AbortController().signal);

    const shadeSessions = db
      .prepare("SELECT COUNT(*) as c FROM sessions WHERE purpose = 'shade'")
      .get() as { c: number };
    assert.ok(shadeSessions.c > 0, "shade sessions should be created");
  });

  it("records shade_run with result_count", async () => {
    patchChatGenerate("The agent consistently chose caution over action when facing ambiguous inputs.");
    seedImpression(ghostpawId);

    await runShardsProcessor(db, soulsDb, "test-model", new AbortController().signal);

    const run = db
      .prepare("SELECT status, result_count FROM shade_runs WHERE processor = 'shards'")
      .get() as { status: string; result_count: number };
    assert.strictEqual(run.status, "done");
    assert.strictEqual(run.result_count, 1);
  });

  it("is idempotent: running twice does not re-process", async () => {
    patchChatGenerate("The agent defaulted to creating separate records rather than resolving identity ambiguity.");
    seedImpression(ghostpawId);

    await runShardsProcessor(db, soulsDb, "test-model", new AbortController().signal);
    const second = await runShardsProcessor(
      db,
      soulsDb,
      "test-model",
      new AbortController().signal,
    );

    assert.strictEqual(second.processed, 0);
  });

  it("aborts mid-batch after processing first impression", async () => {
    seedImpression(ghostpawId);

    const soulIds = bootstrapSouls(soulsDb);
    const s2 = createSession(db, "m", "p", { purpose: "chat", soulId: soulIds.scribe });
    const m2 = addMessage(db, s2.id, "user", "another");
    writeImpression(db, {
      sessionId: s2.id,
      sealedMsgId: m2,
      soulId: soulIds.scribe,
      impressions: "Second soul impression.",
      impressionCount: 1,
      ingestSessionId: null,
    });

    const shardText = "The agent showed a consistent preference for creating new records over merging.";
    const ac = new AbortController();
    mock.method(Chat.prototype, "generate", async function generate(this: Chat) {
      this.addMessage(new Message("assistant", shardText));
      ac.abort();
      return shardText;
    });

    const result = await runShardsProcessor(db, soulsDb, "test-model", ac.signal);
    assert.strictEqual(result.processed, 1, "first impression should be processed before abort");

    const runs = db
      .prepare(
        "SELECT COUNT(*) as c FROM shade_runs WHERE processor = 'shards' AND status = 'done'",
      )
      .get() as { c: number };
    assert.strictEqual(runs.c, 1, "only one run should be completed");
  });

  it("processes impressions for different souls with correct attribution", async () => {
    patchChatGenerate("The agent demonstrated distinct reasoning patterns when handling identity conflicts.");
    seedImpression(ghostpawId);

    const soulIds = bootstrapSouls(soulsDb);
    const scribeId = soulIds.scribe;
    const s2 = createSession(db, "m", "p", { purpose: "chat", soulId: scribeId });
    const m2 = addMessage(db, s2.id, "user", "another");
    writeImpression(db, {
      sessionId: s2.id,
      sealedMsgId: m2,
      soulId: scribeId,
      impressions: "Second soul impression.",
      impressionCount: 1,
      ingestSessionId: null,
    });

    const result = await runShardsProcessor(
      db,
      soulsDb,
      "test-model",
      new AbortController().signal,
    );
    assert.strictEqual(result.processed, 2);

    const runs = db
      .prepare(
        "SELECT COUNT(*) as c FROM shade_runs WHERE processor = 'shards' AND status = 'done'",
      )
      .get() as { c: number };
    assert.strictEqual(runs.c, 2);

    const shards = soulsDb
      .prepare("SELECT * FROM soul_shards WHERE source = 'shade'")
      .all() as Array<{ id: number }>;
    assert.strictEqual(shards.length, 2, "each impression should deposit one shard");

    const shardSouls = soulsDb
      .prepare(
        "SELECT DISTINCT soul_id FROM shard_souls WHERE shard_id IN (SELECT id FROM soul_shards WHERE source = 'shade')",
      )
      .all() as Array<{ soul_id: number }>;
    const soulIdSet = new Set(shardSouls.map((r) => r.soul_id));
    assert.ok(soulIdSet.has(ghostpawId), "ghostpaw soul should have shards");
    assert.ok(soulIdSet.has(scribeId), "scribe soul should have shards");
  });
});
