import assert from "node:assert";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { Chat, Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { addMessage } from "../chat/messages.ts";
import { sealMessage } from "../chat/seal_message.ts";
import { sealSessionTail } from "../chat/seal_session_tail.ts";
import { createSession } from "../chat/session.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { runShadeIngest } from "./ingest.ts";
import { loadSegmentMessages } from "./load_segment_messages.ts";
import { readUningestedSegments } from "./read_uningested_segments.ts";
import { writeImpression } from "./write_impression.ts";

function patchChatGenerate(response: string): void {
  mock.method(Chat.prototype, "generate", async function generate(this: Chat) {
    this.addMessage(new Message("assistant", response));
    return response;
  });
}

let db: DatabaseHandle;

beforeEach(() => {
  db = openMemoryDatabase();
});

afterEach(() => {
  db.close();
  mock.restoreAll();
});

describe("readUningestedSegments", () => {
  it("returns empty when no sealed messages exist", () => {
    const result = readUningestedSegments(db);
    assert.strictEqual(result.length, 0);
  });

  it("returns a segment for a sealed soulful session", () => {
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, session.id, "user", "hello");
    sealSessionTail(db, session.id);

    const result = readUningestedSegments(db);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].session_id, session.id);
    assert.strictEqual(result[0].soul_id, 1);
  });

  it("excludes sessions without soul_id", () => {
    const session = createSession(db, "m", "p", { purpose: "chat" });
    addMessage(db, session.id, "user", "no soul");
    db.prepare(
      "UPDATE messages SET sealed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE session_id = ?",
    ).run(session.id);

    const result = readUningestedSegments(db);
    assert.strictEqual(result.length, 0);
  });

  it("excludes already-ingested segments", () => {
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, session.id, "user", "hello");
    sealSessionTail(db, session.id);

    const segs = readUningestedSegments(db);
    writeImpression(db, {
      sessionId: session.id,
      sealedMsgId: segs[0].sealed_msg_id,
      soulId: 1,
      impressions: "some impression",
      impressionCount: 1,
      ingestSessionId: null,
    });

    const result = readUningestedSegments(db);
    assert.strictEqual(result.length, 0);
  });

  it("returns one row per sealed boundary in a multi-boundary session", () => {
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, session.id, "user", "first");
    addMessage(db, session.id, "assistant", "reply1");
    sealSessionTail(db, session.id);

    addMessage(db, session.id, "user", "second");
    addMessage(db, session.id, "assistant", "reply2");
    sealSessionTail(db, session.id);

    const result = readUningestedSegments(db);
    assert.strictEqual(result.length, 2, "should return two boundaries");
    assert.ok(result[0].sealed_msg_id < result[1].sealed_msg_id, "ordered by id ASC");
  });

  it("excludes only the ingested boundary, not newer ones", () => {
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, session.id, "user", "first");
    addMessage(db, session.id, "assistant", "reply1");
    sealSessionTail(db, session.id);

    addMessage(db, session.id, "user", "second");
    addMessage(db, session.id, "assistant", "reply2");
    sealSessionTail(db, session.id);

    const segs = readUningestedSegments(db);
    writeImpression(db, {
      sessionId: session.id,
      sealedMsgId: segs[0].sealed_msg_id,
      soulId: 1,
      impressions: "first segment",
      impressionCount: 1,
      ingestSessionId: null,
    });

    const remaining = readUningestedSegments(db);
    assert.strictEqual(remaining.length, 1, "only the second boundary should remain");
    assert.strictEqual(remaining[0].sealed_msg_id, segs[1].sealed_msg_id);
  });

  it("handles multiple sessions independently", () => {
    const s1 = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, s1.id, "user", "a");
    sealSessionTail(db, s1.id);

    const s2 = createSession(db, "m", "p", { purpose: "pulse", soulId: 2 });
    addMessage(db, s2.id, "user", "b");
    sealSessionTail(db, s2.id);

    const result = readUningestedSegments(db);
    assert.strictEqual(result.length, 2);
    const sessionIds = result.map((r) => r.session_id).sort();
    assert.deepStrictEqual(sessionIds, [s1.id, s2.id].sort());
  });

  it("includes subsystem_turn sessions", () => {
    const s = createSession(db, "m", "p", { purpose: "subsystem_turn", soulId: 1 });
    addMessage(db, s.id, "user", "task");
    sealSessionTail(db, s.id);

    const result = readUningestedSegments(db);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].session_id, s.id);
  });

  it("includes pulse sessions", () => {
    const s = createSession(db, "m", "p", { purpose: "pulse", soulId: 3 });
    addMessage(db, s.id, "user", "job");
    sealSessionTail(db, s.id);

    const result = readUningestedSegments(db);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].soul_id, 3);
  });

  it("excludes shade-purpose sessions", () => {
    const s = createSession(db, "m", "p", { purpose: "shade", soulId: 1 });
    addMessage(db, s.id, "user", "internal");
    sealMessage(db, addMessage(db, s.id, "assistant", "done"));

    const result = readUningestedSegments(db);
    assert.strictEqual(result.length, 0);
  });

  it("excludes system-purpose sessions", () => {
    const s = createSession(db, "m", "p", { purpose: "system", soulId: 1 });
    addMessage(db, s.id, "user", "oneshot");
    sealMessage(db, addMessage(db, s.id, "assistant", "done"));

    const result = readUningestedSegments(db);
    assert.strictEqual(result.length, 0);
  });
});

describe("loadSegmentMessages", () => {
  it("returns user and assistant messages for a session", () => {
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, session.id, "user", "hello");
    const lastId = addMessage(db, session.id, "assistant", "hi");

    const msgs = loadSegmentMessages(db, session.id, lastId);
    assert.strictEqual(msgs.length, 2);
    assert.strictEqual(msgs[0].role, "user");
    assert.strictEqual(msgs[1].role, "assistant");
  });

  it("excludes tool messages", () => {
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, session.id, "user", "hello");
    addMessage(db, session.id, "tool", "tool result", { toolCallId: "tc1" });
    const lastId = addMessage(db, session.id, "assistant", "done");

    const msgs = loadSegmentMessages(db, session.id, lastId);
    assert.strictEqual(msgs.length, 2, "tool messages should be excluded");
  });

  it("loads only second segment when first is already ingested", () => {
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, session.id, "user", "first");
    const boundary1 = addMessage(db, session.id, "assistant", "reply1");

    writeImpression(db, {
      sessionId: session.id,
      sealedMsgId: boundary1,
      soulId: 1,
      impressions: "first segment",
      impressionCount: 1,
      ingestSessionId: null,
    });

    addMessage(db, session.id, "user", "second");
    const boundary2 = addMessage(db, session.id, "assistant", "reply2");

    const msgs = loadSegmentMessages(db, session.id, boundary2);
    assert.strictEqual(msgs.length, 2);
    assert.strictEqual(msgs[0].content, "second");
    assert.strictEqual(msgs[1].content, "reply2");
  });

  it("includes compaction summaries in segment", () => {
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, session.id, "user", "first");
    const boundary1 = addMessage(db, session.id, "assistant", "reply1");

    writeImpression(db, {
      sessionId: session.id,
      sealedMsgId: boundary1,
      soulId: 1,
      impressions: "first segment",
      impressionCount: 1,
      ingestSessionId: null,
    });

    addMessage(db, session.id, "assistant", "compaction summary", { isCompaction: true });
    addMessage(db, session.id, "user", "after compaction");
    const boundary2 = addMessage(db, session.id, "assistant", "reply2");

    const msgs = loadSegmentMessages(db, session.id, boundary2);
    assert.strictEqual(msgs.length, 3);
    assert.strictEqual(msgs[0].is_compaction, 1);
    assert.strictEqual(msgs[0].content, "compaction summary");
  });

  it("returns empty when no user/assistant messages in range", () => {
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    const boundary1 = addMessage(db, session.id, "tool", "tool only", { toolCallId: "tc1" });

    writeImpression(db, {
      sessionId: session.id,
      sealedMsgId: boundary1,
      soulId: 1,
      impressions: "first",
      impressionCount: 0,
      ingestSessionId: null,
    });

    const boundary2 = addMessage(db, session.id, "tool", "tool again", { toolCallId: "tc2" });
    const msgs = loadSegmentMessages(db, session.id, boundary2);
    assert.strictEqual(msgs.length, 0);
  });
});

describe("writeImpression", () => {
  it("persists impression with all fields", () => {
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    const msgId = addMessage(db, session.id, "user", "hello");

    const impression = writeImpression(db, {
      sessionId: session.id,
      sealedMsgId: msgId,
      soulId: 1,
      impressions: "Agent responded promptly",
      impressionCount: 1,
      ingestSessionId: null,
    });

    assert.ok(impression.id > 0);
    assert.strictEqual(impression.impressions, "Agent responded promptly");
    assert.strictEqual(impression.impression_count, 1);
    assert.strictEqual(impression.session_id, session.id);
    assert.strictEqual(impression.sealed_msg_id, msgId);
  });

  it("enforces unique constraint on sealed_msg_id", () => {
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    const msgId = addMessage(db, session.id, "user", "hello");

    writeImpression(db, {
      sessionId: session.id,
      sealedMsgId: msgId,
      soulId: 1,
      impressions: "first",
      impressionCount: 1,
      ingestSessionId: null,
    });

    assert.throws(() => {
      writeImpression(db, {
        sessionId: session.id,
        sealedMsgId: msgId,
        soulId: 1,
        impressions: "duplicate",
        impressionCount: 1,
        ingestSessionId: null,
      });
    });
  });
});

describe("runShadeIngest", () => {
  it("ingests a sealed segment and creates an impression", async () => {
    patchChatGenerate("Agent handled the task cleanly\n\nGood reasoning shown");
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, session.id, "user", "do something");
    addMessage(db, session.id, "assistant", "done");
    sealSessionTail(db, session.id);

    const result = await runShadeIngest(db, "test-model", new AbortController().signal);
    assert.strictEqual(result.ingested, 1);
    assert.strictEqual(result.skipped, 0);

    const impressions = db.prepare("SELECT * FROM shade_impressions").all() as Array<{
      impression_count: number;
    }>;
    assert.strictEqual(impressions.length, 1);
    assert.strictEqual(impressions[0].impression_count, 2);
  });

  it("stores (none) impression with count 0 for empty signal", async () => {
    patchChatGenerate("(none)");
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, session.id, "user", "boring");
    addMessage(db, session.id, "assistant", "ok");
    sealSessionTail(db, session.id);

    await runShadeIngest(db, "test-model", new AbortController().signal);

    const row = db.prepare("SELECT impression_count, impressions FROM shade_impressions").get() as {
      impression_count: number;
      impressions: string;
    };
    assert.strictEqual(row.impression_count, 0);
    assert.strictEqual(row.impressions, "(none)");
  });

  it("is idempotent: running twice does not double-ingest", async () => {
    patchChatGenerate("One good impression");
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, session.id, "user", "hello");
    addMessage(db, session.id, "assistant", "hi");
    sealSessionTail(db, session.id);

    await runShadeIngest(db, "test-model", new AbortController().signal);
    const result2 = await runShadeIngest(db, "test-model", new AbortController().signal);
    assert.strictEqual(result2.ingested, 0);

    const count = (db.prepare("SELECT COUNT(*) as c FROM shade_impressions").get() as { c: number })
      .c;
    assert.strictEqual(count, 1);
  });

  it("creates shade-purpose sessions for ingestion oneshots", async () => {
    patchChatGenerate("An impression");
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, session.id, "user", "test");
    addMessage(db, session.id, "assistant", "ok");
    sealSessionTail(db, session.id);

    await runShadeIngest(db, "test-model", new AbortController().signal);

    const shadeSession = db.prepare("SELECT purpose FROM sessions WHERE purpose = 'shade'").get() as
      | { purpose: string }
      | undefined;
    assert.ok(shadeSession, "a shade-purpose session should be created");
  });

  it("returns zero when no sealed segments exist", async () => {
    const result = await runShadeIngest(db, "test-model", new AbortController().signal);
    assert.strictEqual(result.ingested, 0);
    assert.strictEqual(result.skipped, 0);
  });

  it("consumes empty segments without LLM call and prevents re-processing", async () => {
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, session.id, "tool", "tool only", { toolCallId: "tc1" });
    sealSessionTail(db, session.id);

    const first = await runShadeIngest(db, "test-model", new AbortController().signal);
    assert.strictEqual(first.skipped, 1);
    assert.strictEqual(first.ingested, 0);

    const row = db.prepare("SELECT impression_count, impressions FROM shade_impressions").get() as {
      impression_count: number;
      impressions: string;
    };
    assert.strictEqual(row.impression_count, 0);
    assert.strictEqual(row.impressions, "");

    const second = await runShadeIngest(db, "test-model", new AbortController().signal);
    assert.strictEqual(second.skipped, 0, "boundary should be consumed");
    assert.strictEqual(second.ingested, 0);

    const noShade = db
      .prepare("SELECT COUNT(*) as c FROM sessions WHERE purpose = 'shade'")
      .get() as { c: number };
    assert.strictEqual(noShade.c, 0, "no LLM call should have been made");
  });

  it("aborts between segments when signal is triggered", async () => {
    patchChatGenerate("An impression");
    const s1 = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, s1.id, "user", "first");
    addMessage(db, s1.id, "assistant", "reply1");
    sealSessionTail(db, s1.id);

    const s2 = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, s2.id, "user", "second");
    addMessage(db, s2.id, "assistant", "reply2");
    sealSessionTail(db, s2.id);

    const ac = new AbortController();
    mock.method(Chat.prototype, "generate", async function generate(this: Chat) {
      this.addMessage(new Message("assistant", "An impression"));
      ac.abort();
      return "An impression";
    });

    const result = await runShadeIngest(db, "test-model", ac.signal);
    assert.strictEqual(result.ingested, 1, "first segment should be ingested");

    const count = (db.prepare("SELECT COUNT(*) as c FROM shade_impressions").get() as { c: number })
      .c;
    assert.strictEqual(count, 1, "only one impression should exist");
  });

  it("stores the full impression text from the LLM output", async () => {
    const llmOutput =
      "[correction] Fixed a factual error.\nEvidence: turn 2.\n\n[strong] Good call.";
    patchChatGenerate(llmOutput);
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, session.id, "user", "test");
    addMessage(db, session.id, "assistant", "ok");
    sealSessionTail(db, session.id);

    await runShadeIngest(db, "test-model", new AbortController().signal);

    const row = db.prepare("SELECT impressions, impression_count FROM shade_impressions").get() as {
      impressions: string;
      impression_count: number;
    };
    assert.strictEqual(row.impressions, llmOutput);
    assert.strictEqual(row.impression_count, 2);
  });

  it("counts single paragraph as one impression", async () => {
    patchChatGenerate("One single observation without blank lines.");
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, session.id, "user", "test");
    addMessage(db, session.id, "assistant", "ok");
    sealSessionTail(db, session.id);

    await runShadeIngest(db, "test-model", new AbortController().signal);

    const row = db.prepare("SELECT impression_count FROM shade_impressions").get() as {
      impression_count: number;
    };
    assert.strictEqual(row.impression_count, 1);
  });

  it("handles (none) with trailing whitespace", async () => {
    patchChatGenerate("  (none)  ");
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    addMessage(db, session.id, "user", "test");
    addMessage(db, session.id, "assistant", "ok");
    sealSessionTail(db, session.id);

    await runShadeIngest(db, "test-model", new AbortController().signal);

    const row = db.prepare("SELECT impression_count FROM shade_impressions").get() as {
      impression_count: number;
    };
    assert.strictEqual(row.impression_count, 0);
  });
});
