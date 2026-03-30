import assert from "node:assert";
import { afterEach, describe, it, mock } from "node:test";
import { Chat, Message } from "chatoyant";
import type { RuntimeContext } from "../../runtime.ts";
import { addMessage } from "../chat/messages.ts";
import { sealSessionTail } from "../chat/seal_session_tail.ts";
import { createSession } from "../chat/session.ts";
import { openMemoryAffinityDatabase } from "../db/open_affinity.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { openMemorySoulsDatabase } from "../db/open_souls.ts";
import { writeImpression } from "../shade/write_impression.ts";
import { bootstrapSouls } from "../souls/bootstrap.ts";
import {
  attuneHandler,
  heartbeatHandler,
  runBuiltin,
  sealSweepHandler,
  tendHandler,
} from "./builtins.ts";
import { ensureDefaultPulses } from "./defaults.ts";

function makeCtx(db: ReturnType<typeof openMemoryDatabase>): RuntimeContext {
  return { db } as unknown as RuntimeContext;
}

function makeFullCtx(
  db: ReturnType<typeof openMemoryDatabase>,
  soulsDb: ReturnType<typeof openMemoryDatabase>,
): RuntimeContext {
  return {
    db,
    soulsDb,
    config: { model_small: "test-model" },
  } as unknown as RuntimeContext;
}

afterEach(() => {
  mock.restoreAll();
});

describe("heartbeatHandler", () => {
  it("returns all four health check fields", async () => {
    const db = openMemoryDatabase();
    const result = await heartbeatHandler(makeCtx(db), new AbortController().signal);
    assert.strictEqual(result.exitCode, 0);
    const parsed = JSON.parse(result.output ?? "{}");
    assert.ok("untitled_chat_sessions" in parsed);
    assert.ok("failing_pulses" in parsed);
    assert.ok("running_pulses" in parsed);
    assert.ok("db_page_count" in parsed);
  });

  it("counts failing pulses accurately", async () => {
    const db = openMemoryDatabase();
    ensureDefaultPulses(db);
    db.prepare("UPDATE pulses SET last_exit_code = 1 WHERE name = 'heartbeat'").run();
    const result = await heartbeatHandler(makeCtx(db), new AbortController().signal);
    const parsed = JSON.parse(result.output ?? "{}");
    assert.strictEqual(parsed.failing_pulses, 1);
  });

  it("counts running pulses accurately", async () => {
    const db = openMemoryDatabase();
    ensureDefaultPulses(db);
    db.prepare(
      "UPDATE pulses SET running = 1, started_at = '2026-01-01T00:00:00.000Z' WHERE name = 'heartbeat'",
    ).run();
    const result = await heartbeatHandler(makeCtx(db), new AbortController().signal);
    const parsed = JSON.parse(result.output ?? "{}");
    assert.strictEqual(parsed.running_pulses, 1);
  });

  it("reports zero counts on empty database", async () => {
    const db = openMemoryDatabase();
    const result = await heartbeatHandler(makeCtx(db), new AbortController().signal);
    const parsed = JSON.parse(result.output ?? "{}");
    assert.strictEqual(parsed.untitled_chat_sessions, 0);
    assert.strictEqual(parsed.failing_pulses, 0);
    assert.strictEqual(parsed.running_pulses, 0);
  });
});

describe("runBuiltin", () => {
  it("delegates heartbeat to heartbeatHandler", async () => {
    const db = openMemoryDatabase();
    const result = await runBuiltin(makeCtx(db), "heartbeat", new AbortController().signal);
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.output?.includes("db_page_count"));
  });

  it("delegates seal_sweep to sealSweepHandler", async () => {
    const db = openMemoryDatabase();
    const result = await runBuiltin(makeCtx(db), "seal_sweep", new AbortController().signal);
    assert.strictEqual(result.exitCode, 0);
  });

  it("returns exitCode 1 for unknown builtin", async () => {
    const db = openMemoryDatabase();
    const result = await runBuiltin(makeCtx(db), "nope", new AbortController().signal);
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.error?.includes("unknown builtin: nope"));
  });

  it("returns exitCode 1 for empty command", async () => {
    const db = openMemoryDatabase();
    const result = await runBuiltin(makeCtx(db), "", new AbortController().signal);
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.error?.includes("unknown builtin"));
  });
});

describe("sealSweepHandler", () => {
  it("seals stale unsealed sessions", async () => {
    const db = openMemoryDatabase();
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, session.id, "user", "old message");
    db.prepare("UPDATE sessions SET updated_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(
      session.id,
    );

    const result = await sealSweepHandler(makeCtx(db), new AbortController().signal);
    assert.strictEqual(result.exitCode, 0);
    const parsed = JSON.parse(result.output ?? "{}");
    assert.strictEqual(parsed.stale_sessions_found, 1);
    assert.strictEqual(parsed.messages_sealed, 1);
  });

  it("returns zero counts when nothing is stale", async () => {
    const db = openMemoryDatabase();
    const result = await sealSweepHandler(makeCtx(db), new AbortController().signal);
    const parsed = JSON.parse(result.output ?? "{}");
    assert.strictEqual(parsed.stale_sessions_found, 0);
    assert.strictEqual(parsed.messages_sealed, 0);
  });

  it("skips stale session whose tail is already sealed", async () => {
    const db = openMemoryDatabase();
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, session.id, "user", "first");
    const lastId = addMessage(db, session.id, "assistant", "reply");

    db.prepare(
      "UPDATE messages SET sealed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
    ).run(lastId);
    db.prepare("UPDATE sessions SET updated_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(
      session.id,
    );

    const result = await sealSweepHandler(makeCtx(db), new AbortController().signal);
    const parsed = JSON.parse(result.output ?? "{}");
    assert.strictEqual(parsed.stale_sessions_found, 0);
    assert.strictEqual(parsed.messages_sealed, 0);
  });

  it("seals only the last message per stale session (boundary-only)", async () => {
    const db = openMemoryDatabase();
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, session.id, "user", "msg1");
    addMessage(db, session.id, "assistant", "msg2");
    addMessage(db, session.id, "user", "msg3");
    addMessage(db, session.id, "assistant", "msg4");

    db.prepare("UPDATE sessions SET updated_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(
      session.id,
    );

    const result = await sealSweepHandler(makeCtx(db), new AbortController().signal);
    const parsed = JSON.parse(result.output ?? "{}");
    assert.strictEqual(parsed.messages_sealed, 1, "should seal exactly one boundary message");

    const sealed = db
      .prepare("SELECT COUNT(*) as c FROM messages WHERE session_id = ? AND sealed_at IS NOT NULL")
      .get(session.id) as { c: number };
    assert.strictEqual(sealed.c, 1);
  });
});

describe("shade builtin wiring", () => {
  it("shade_ingest handler ingests sealed segments via runBuiltin", async () => {
    mock.method(Chat.prototype, "generate", async function generate(this: Chat) {
      this.addMessage(new Message("assistant", "An impression observed."));
      return "An impression observed.";
    });

    const db = openMemoryDatabase();
    const soulsDb = openMemorySoulsDatabase();
    bootstrapSouls(soulsDb);

    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, session.id, "user", "test message");
    addMessage(db, session.id, "assistant", "response");
    sealSessionTail(db, session.id);

    const result = await runBuiltin(
      makeFullCtx(db, soulsDb),
      "shade_ingest",
      new AbortController().signal,
    );
    assert.strictEqual(result.exitCode, 0);

    const parsed = JSON.parse(result.output ?? "{}");
    assert.strictEqual(parsed.ingested, 1);

    const impressions = db.prepare("SELECT COUNT(*) as c FROM shade_impressions").get() as {
      c: number;
    };
    assert.strictEqual(impressions.c, 1);

    db.close();
    soulsDb.close();
  });

  it("shade_shards handler processes impressions via runBuiltin", async () => {
    const shardText = "The agent showed a systematic bias toward caution when handling identity conflicts.";
    mock.method(Chat.prototype, "generate", async function generate(this: Chat) {
      this.addMessage(new Message("assistant", shardText));
      return shardText;
    });

    const db = openMemoryDatabase();
    const soulsDb = openMemorySoulsDatabase();
    const soulIds = bootstrapSouls(soulsDb);

    const session = createSession(db, "m", "p", { purpose: "chat", soulId: soulIds.ghostpaw });
    const msgId = addMessage(db, session.id, "user", "hello");
    writeImpression(db, {
      sessionId: session.id,
      sealedMsgId: msgId,
      soulId: soulIds.ghostpaw,
      impressions: "Agent showed strong reasoning.",
      impressionCount: 1,
      ingestSessionId: null,
    });

    const result = await runBuiltin(
      makeFullCtx(db, soulsDb),
      "shade_shards",
      new AbortController().signal,
    );
    assert.strictEqual(result.exitCode, 0);

    const parsed = JSON.parse(result.output ?? "{}");
    assert.strictEqual(parsed.processed, 1);
    assert.strictEqual(parsed.errors, 0);

    const shards = soulsDb
      .prepare("SELECT COUNT(*) as c FROM soul_shards WHERE source = 'shade'")
      .get() as { c: number };
    assert.strictEqual(shards.c, 1);

    db.close();
    soulsDb.close();
  });
});

describe("attune builtin wiring", () => {
  it("attuneHandler returns maintenance phase when no shards exist", async () => {
    const db = openMemoryDatabase();
    const soulsDb = openMemorySoulsDatabase();
    const soulIds = bootstrapSouls(soulsDb);
    const ctx = {
      db,
      soulsDb,
      config: { model: "test-model", model_small: "test-model" },
      soulIds,
    } as unknown as RuntimeContext;

    const result = await attuneHandler(ctx, new AbortController().signal);
    assert.strictEqual(result.exitCode, 0);
    const parsed = JSON.parse(result.output ?? "{}");
    assert.strictEqual(parsed.phase, "maintenance");
    assert.strictEqual(parsed.readySoulsCount, 0);

    db.close();
    soulsDb.close();
  });

  it("attune is registered in BUILTINS and callable via runBuiltin", async () => {
    const db = openMemoryDatabase();
    const soulsDb = openMemorySoulsDatabase();
    const soulIds = bootstrapSouls(soulsDb);
    const ctx = {
      db,
      soulsDb,
      config: { model: "test-model", model_small: "test-model" },
      soulIds,
    } as unknown as RuntimeContext;

    const result = await runBuiltin(ctx, "attune", new AbortController().signal);
    assert.strictEqual(result.exitCode, 0);
    const parsed = JSON.parse(result.output ?? "{}");
    assert.strictEqual(parsed.phase, "maintenance");

    db.close();
    soulsDb.close();
  });
});

describe("tend builtin wiring", () => {
  it("tendHandler returns maintenance phase when no contacts exist", async () => {
    const db = openMemoryDatabase();
    const soulsDb = openMemorySoulsDatabase();
    const affinityDb = await openMemoryAffinityDatabase();
    const soulIds = bootstrapSouls(soulsDb);
    const ctx = {
      db,
      affinityDb,
      soulsDb,
      config: { model: "test-model", model_small: "test-model" },
      soulIds,
    } as unknown as RuntimeContext;

    const result = await tendHandler(ctx, new AbortController().signal);
    assert.strictEqual(result.exitCode, 0);
    const parsed = JSON.parse(result.output ?? "{}");
    assert.strictEqual(parsed.phase, "maintenance");
    assert.strictEqual(parsed.duplicates, 0);
    assert.strictEqual(parsed.driftItems, 0);

    db.close();
    affinityDb.close();
    soulsDb.close();
  });

  it("tend is registered in BUILTINS and callable via runBuiltin", async () => {
    const db = openMemoryDatabase();
    const soulsDb = openMemorySoulsDatabase();
    const affinityDb = await openMemoryAffinityDatabase();
    const soulIds = bootstrapSouls(soulsDb);
    const ctx = {
      db,
      affinityDb,
      soulsDb,
      config: { model: "test-model", model_small: "test-model" },
      soulIds,
    } as unknown as RuntimeContext;

    const result = await runBuiltin(ctx, "tend", new AbortController().signal);
    assert.strictEqual(result.exitCode, 0);
    const parsed = JSON.parse(result.output ?? "{}");
    assert.strictEqual(parsed.phase, "maintenance");

    db.close();
    affinityDb.close();
    soulsDb.close();
  });
});
