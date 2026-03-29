import assert from "node:assert";
import { describe, it } from "node:test";
import { openMemoryDatabase } from "../db/open.ts";
import { heartbeatHandler, runBuiltin } from "./builtins.ts";
import { ensureDefaultPulses } from "./defaults.ts";

describe("heartbeatHandler", () => {
  it("returns all four health check fields", async () => {
    const db = openMemoryDatabase();
    const result = await heartbeatHandler(db, new AbortController().signal);
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
    const result = await heartbeatHandler(db, new AbortController().signal);
    const parsed = JSON.parse(result.output ?? "{}");
    assert.strictEqual(parsed.failing_pulses, 1);
  });

  it("counts running pulses accurately", async () => {
    const db = openMemoryDatabase();
    ensureDefaultPulses(db);
    db.prepare(
      "UPDATE pulses SET running = 1, started_at = '2026-01-01T00:00:00.000Z' WHERE name = 'heartbeat'",
    ).run();
    const result = await heartbeatHandler(db, new AbortController().signal);
    const parsed = JSON.parse(result.output ?? "{}");
    assert.strictEqual(parsed.running_pulses, 1);
  });

  it("reports zero counts on empty database", async () => {
    const db = openMemoryDatabase();
    const result = await heartbeatHandler(db, new AbortController().signal);
    const parsed = JSON.parse(result.output ?? "{}");
    assert.strictEqual(parsed.untitled_chat_sessions, 0);
    assert.strictEqual(parsed.failing_pulses, 0);
    assert.strictEqual(parsed.running_pulses, 0);
  });
});

describe("runBuiltin", () => {
  it("delegates heartbeat to heartbeatHandler", async () => {
    const db = openMemoryDatabase();
    const result = await runBuiltin(db, "heartbeat", new AbortController().signal);
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.output?.includes("db_page_count"));
  });

  it("returns exitCode 1 for unknown builtin", async () => {
    const db = openMemoryDatabase();
    const result = await runBuiltin(db, "nope", new AbortController().signal);
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.error?.includes("unknown builtin: nope"));
  });

  it("returns exitCode 1 for empty command", async () => {
    const db = openMemoryDatabase();
    const result = await runBuiltin(db, "", new AbortController().signal);
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.error?.includes("unknown builtin"));
  });
});
