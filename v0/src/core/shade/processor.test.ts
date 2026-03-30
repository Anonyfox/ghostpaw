import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { addMessage } from "../chat/messages.ts";
import { createSession } from "../chat/session.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { claimProcessorRun } from "./claim_processor_run.ts";
import { completeProcessorRun } from "./complete_processor_run.ts";
import { listUnprocessedImpressions } from "./list_unprocessed_impressions.ts";
import { runProcessor } from "./processor.ts";
import { writeImpression } from "./write_impression.ts";

let db: DatabaseHandle;

function seedImpression(db: DatabaseHandle, impressionCount = 1): number {
  const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
  const msgId = addMessage(db, session.id, "user", "hello");
  const imp = writeImpression(db, {
    sessionId: session.id,
    sealedMsgId: msgId,
    soulId: 1,
    impressions: "Agent behaved well",
    impressionCount,
    ingestSessionId: null,
  });
  return imp.id;
}

beforeEach(() => {
  db = openMemoryDatabase();
});

afterEach(() => {
  db.close();
});

describe("listUnprocessedImpressions", () => {
  it("returns empty when no impressions exist", () => {
    const result = listUnprocessedImpressions(db, "test");
    assert.strictEqual(result.length, 0);
  });

  it("returns impressions not yet processed by the named processor", () => {
    seedImpression(db);
    const result = listUnprocessedImpressions(db, "my_processor");
    assert.strictEqual(result.length, 1);
  });

  it("excludes impressions with zero impression_count", () => {
    const session = createSession(db, "m", "p", { purpose: "chat", soulId: 1 });
    const msgId = addMessage(db, session.id, "user", "boring");
    writeImpression(db, {
      sessionId: session.id,
      sealedMsgId: msgId,
      soulId: 1,
      impressions: "(none)",
      impressionCount: 0,
      ingestSessionId: null,
    });
    const result = listUnprocessedImpressions(db, "my_processor");
    assert.strictEqual(result.length, 0);
  });

  it("excludes impressions already processed by the named processor", () => {
    const impId = seedImpression(db);
    const runId = claimProcessorRun(db, impId, "done_processor");
    assert.ok(runId);
    completeProcessorRun(db, { runId, status: "done", resultCount: 0 });

    const result = listUnprocessedImpressions(db, "done_processor");
    assert.strictEqual(result.length, 0);
  });

  it("returns impression for a different processor even if one is done", () => {
    const impId = seedImpression(db);
    const runId = claimProcessorRun(db, impId, "processor_a");
    assert.ok(runId);
    completeProcessorRun(db, { runId, status: "done", resultCount: 0 });

    const result = listUnprocessedImpressions(db, "processor_b");
    assert.strictEqual(result.length, 1);
  });

  it("returns impression with an errored run (retry eligible)", () => {
    const impId = seedImpression(db);
    const runId = claimProcessorRun(db, impId, "retry_proc")!;
    completeProcessorRun(db, { runId, status: "error", error: "transient" });

    const result = listUnprocessedImpressions(db, "retry_proc");
    assert.strictEqual(result.length, 1, "errored impression should be eligible for retry");
  });

  it("returns impression with a stale running run (retry eligible)", () => {
    const impId = seedImpression(db);
    claimProcessorRun(db, impId, "stale_proc");

    const result = listUnprocessedImpressions(db, "stale_proc");
    assert.strictEqual(result.length, 1, "running impression should be eligible for retry");
  });
});

describe("claimProcessorRun", () => {
  it("creates a running shade_runs record", () => {
    const impId = seedImpression(db);
    const runId = claimProcessorRun(db, impId, "test");
    assert.ok(runId != null);

    const row = db.prepare("SELECT status, started_at FROM shade_runs WHERE id = ?").get(runId) as {
      status: string;
      started_at: string;
    };
    assert.strictEqual(row.status, "running");
    assert.ok(row.started_at != null);
  });

  it("reclaims a stale running run on second claim", () => {
    const impId = seedImpression(db);
    const first = claimProcessorRun(db, impId, "test");
    assert.ok(first != null);

    const second = claimProcessorRun(db, impId, "test");
    assert.ok(second != null, "second claim should succeed by reclaiming the running row");

    const runs = db
      .prepare("SELECT COUNT(*) as c FROM shade_runs WHERE impression_id = ? AND processor = ?")
      .get(impId, "test") as { c: number };
    assert.strictEqual(runs.c, 1, "only one row should remain");
  });

  it("returns null when a done run already exists", () => {
    const impId = seedImpression(db);
    const runId = claimProcessorRun(db, impId, "test")!;
    completeProcessorRun(db, { runId, status: "done", resultCount: 1 });

    const second = claimProcessorRun(db, impId, "test");
    assert.strictEqual(second, null, "should not reclaim a done run");
  });

  it("clears an errored run and reclaims", () => {
    const impId = seedImpression(db);
    const runId = claimProcessorRun(db, impId, "retry_proc")!;
    completeProcessorRun(db, { runId, status: "error", error: "boom" });

    const newRunId = claimProcessorRun(db, impId, "retry_proc");
    assert.ok(newRunId != null, "should reclaim after error");

    const row = db.prepare("SELECT status FROM shade_runs WHERE id = ?").get(newRunId!) as {
      status: string;
    };
    assert.strictEqual(row.status, "running");
  });
});

describe("completeProcessorRun", () => {
  it("updates status to done with result_count", () => {
    const impId = seedImpression(db);
    const runId = claimProcessorRun(db, impId, "test")!;

    completeProcessorRun(db, { runId, status: "done", resultCount: 3 });

    const row = db
      .prepare("SELECT status, result_count, finished_at FROM shade_runs WHERE id = ?")
      .get(runId) as { status: string; result_count: number; finished_at: string };
    assert.strictEqual(row.status, "done");
    assert.strictEqual(row.result_count, 3);
    assert.ok(row.finished_at != null);
  });

  it("records error status with message", () => {
    const impId = seedImpression(db);
    const runId = claimProcessorRun(db, impId, "test")!;

    completeProcessorRun(db, { runId, status: "error", error: "something went wrong" });

    const row = db.prepare("SELECT status, error FROM shade_runs WHERE id = ?").get(runId) as {
      status: string;
      error: string;
    };
    assert.strictEqual(row.status, "error");
    assert.strictEqual(row.error, "something went wrong");
  });
});

describe("runProcessor", () => {
  it("processes available impressions with the callback", async () => {
    seedImpression(db);
    let callCount = 0;

    const result = await runProcessor(
      db,
      "my_proc",
      async () => {
        callCount++;
        return { resultCount: 1 };
      },
      new AbortController().signal,
    );

    assert.strictEqual(result.processed, 1);
    assert.strictEqual(result.errors, 0);
    assert.strictEqual(callCount, 1);
  });

  it("marks run as done after successful callback", async () => {
    seedImpression(db);

    await runProcessor(
      db,
      "test_done",
      async () => ({ resultCount: 2 }),
      new AbortController().signal,
    );

    const row = db
      .prepare("SELECT status, result_count FROM shade_runs WHERE processor = 'test_done'")
      .get() as { status: string; result_count: number };
    assert.strictEqual(row.status, "done");
    assert.strictEqual(row.result_count, 2);
  });

  it("marks run as error when callback throws", async () => {
    seedImpression(db);

    const result = await runProcessor(
      db,
      "failing_proc",
      async () => {
        throw new Error("oops");
      },
      new AbortController().signal,
    );

    assert.strictEqual(result.errors, 1);
    assert.strictEqual(result.processed, 0);

    const row = db
      .prepare("SELECT status, error FROM shade_runs WHERE processor = 'failing_proc'")
      .get() as { status: string; error: string };
    assert.strictEqual(row.status, "error");
    assert.ok(row.error.includes("oops"));
  });

  it("skips already-processed impressions", async () => {
    const impId = seedImpression(db);
    const runId = claimProcessorRun(db, impId, "already_done")!;
    completeProcessorRun(db, { runId, status: "done", resultCount: 0 });

    let callCount = 0;
    await runProcessor(
      db,
      "already_done",
      async () => {
        callCount++;
        return { resultCount: 0 };
      },
      new AbortController().signal,
    );

    assert.strictEqual(callCount, 0);
  });

  it("returns zero when no impressions are available", async () => {
    const result = await runProcessor(
      db,
      "empty_proc",
      async () => ({ resultCount: 0 }),
      new AbortController().signal,
    );
    assert.strictEqual(result.processed, 0);
    assert.strictEqual(result.errors, 0);
  });

  it("aborts mid-batch after first impression", async () => {
    seedImpression(db);
    seedImpression(db);

    const ac = new AbortController();
    let callCount = 0;

    const result = await runProcessor(
      db,
      "abort_proc",
      async () => {
        callCount++;
        ac.abort();
        return { resultCount: 1 };
      },
      ac.signal,
    );

    assert.strictEqual(callCount, 1, "callback should run once before abort");
    assert.strictEqual(result.processed, 1);

    const unprocessed = db
      .prepare(
        "SELECT COUNT(*) as c FROM shade_impressions si WHERE NOT EXISTS (SELECT 1 FROM shade_runs sr WHERE sr.impression_id = si.id AND sr.processor = 'abort_proc')",
      )
      .get() as { c: number };
    assert.strictEqual(unprocessed.c, 1, "second impression should remain unprocessed");
  });

  it("respects limit parameter", async () => {
    seedImpression(db);
    seedImpression(db);
    seedImpression(db);

    let callCount = 0;
    const result = await runProcessor(
      db,
      "limit_proc",
      async () => {
        callCount++;
        return { resultCount: 1 };
      },
      new AbortController().signal,
      1,
    );

    assert.strictEqual(callCount, 1, "should only process 1 of 3");
    assert.strictEqual(result.processed, 1);
  });

  it("passes correct impression and signal to callback", async () => {
    const impId = seedImpression(db);
    const ac = new AbortController();
    let receivedImpression: unknown = null;
    let receivedSignal: unknown = null;

    await runProcessor(
      db,
      "args_proc",
      async (_db, impression, signal) => {
        receivedImpression = impression;
        receivedSignal = signal;
        return { resultCount: 0 };
      },
      ac.signal,
    );

    assert.ok(receivedImpression != null, "callback should receive impression");
    assert.strictEqual((receivedImpression as { id: number }).id, impId);
    assert.strictEqual(receivedSignal, ac.signal, "callback should receive the abort signal");
  });

  it("retries a previously-failed impression on next pass", async () => {
    seedImpression(db);

    let attempts = 0;
    const failOnce = async () => {
      attempts++;
      if (attempts === 1) throw new Error("transient failure");
      return { resultCount: 1 };
    };

    const first = await runProcessor(db, "retry_test", failOnce, new AbortController().signal);
    assert.strictEqual(first.errors, 1);

    const second = await runProcessor(db, "retry_test", failOnce, new AbortController().signal);
    assert.strictEqual(second.processed, 1);
    assert.strictEqual(second.errors, 0);
    assert.strictEqual(attempts, 2);

    const run = db
      .prepare("SELECT status FROM shade_runs WHERE processor = 'retry_test'")
      .get() as { status: string };
    assert.strictEqual(run.status, "done");
  });
});
