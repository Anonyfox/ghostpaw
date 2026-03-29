import assert from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { openMemoryDatabase } from "../db/open.ts";
import { ensureDefaultPulses } from "../pulse/defaults.ts";
import { createPulseTool } from "./pulse.ts";

type ToolResult = Record<string, unknown>;
type DB = ReturnType<typeof openMemoryDatabase>;

let db: DB;
let execute: (args: Record<string, unknown>) => Promise<ToolResult>;

beforeEach(() => {
  db = openMemoryDatabase();
  ensureDefaultPulses(db);
  const tool = createPulseTool(db);
  execute = (args) =>
    tool.execute({ args, ctx: { model: "test", provider: "test" } }) as Promise<ToolResult>;
});

function hasError(r: ToolResult): boolean {
  return typeof r.error === "string";
}

function hasHint(r: ToolResult): boolean {
  return typeof r.hint === "string";
}

async function createTestPulse(
  overrides: Record<string, unknown> = {},
): Promise<{ id: number; name: string }> {
  const defaults = {
    action: "create",
    name: `test-${Date.now()}`,
    type: "agent",
    command: "do thing",
    interval_seconds: 120,
  };
  const r = await execute({ ...defaults, ...overrides });
  return { id: r.id as number, name: r.name as string };
}

describe("pulse tool - list", () => {
  it("returns all pulses with IDs prominently", async () => {
    const r = await execute({ action: "list" });
    assert.ok(Array.isArray(r.pulses));
    const first = (r.pulses as Record<string, unknown>[])[0];
    assert.ok("id" in first, "list must include id");
    assert.ok(typeof first.id === "number");
    assert.ok("name" in first);
    assert.ok("status" in first);
  });

  it("does not expose raw internal fields", async () => {
    const r = await execute({ action: "list" });
    const first = (r.pulses as Record<string, unknown>[])[0];
    assert.ok(!("running_pid" in first));
    assert.ok(!("started_at" in first));
    assert.ok(!("created_at" in first));
    assert.ok(!("updated_at" in first));
  });
});

describe("pulse tool - show", () => {
  it("shows a pulse by id", async () => {
    const heartbeat = (
      (await execute({ action: "list" })).pulses as Record<string, unknown>[]
    ).find((p) => p.name === "heartbeat");
    const r = await execute({ action: "show", id: heartbeat?.id });
    assert.ok(r.pulse);
    assert.ok(Array.isArray(r.last_runs));
    assert.ok("command" in (r.pulse as Record<string, unknown>));
    assert.ok("id" in (r.pulse as Record<string, unknown>));
  });

  it("rejects show without id (with hint)", async () => {
    const r = await execute({ action: "show" });
    assert.ok(hasError(r));
    assert.ok(hasHint(r));
    assert.ok((r.hint as string).includes("list"));
  });

  it("rejects show for nonexistent id", async () => {
    const r = await execute({ action: "show", id: 99999 });
    assert.ok(hasError(r));
    assert.ok((r.error as string).includes("99999"));
  });
});

describe("pulse tool - create", () => {
  it("returns the new pulse id on success", async () => {
    const r = await execute({
      action: "create",
      name: "news",
      type: "agent",
      command: "fetch news",
      interval_seconds: 120,
    });
    assert.strictEqual(r.ok, true);
    assert.ok(typeof r.id === "number");
    assert.ok(r.id > 0);
    assert.ok(r.next_run_at);
    assert.strictEqual(r.type, "agent");
  });

  it("creates agent pulse with cron", async () => {
    const r = await execute({
      action: "create",
      name: "daily",
      type: "agent",
      command: "daily report",
      cron: "0 9 * * *",
    });
    assert.strictEqual(r.ok, true);
    assert.ok(typeof r.id === "number");
  });

  it("creates shell pulse", async () => {
    const r = await execute({
      action: "create",
      name: "backup",
      type: "shell",
      command: "echo backup",
      interval_seconds: 3600,
    });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.type, "shell");
  });

  it("creates one-off agent pulse with at", async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const r = await execute({
      action: "create",
      name: "once-test",
      type: "agent",
      command: "do thing",
      at: future,
    });
    assert.strictEqual(r.ok, true);
    assert.ok(typeof r.id === "number");
  });

  it("rejects create without name", async () => {
    const r = await execute({
      action: "create",
      type: "agent",
      command: "x",
      interval_seconds: 120,
    });
    assert.ok(hasError(r));
    assert.ok(hasHint(r));
  });

  it("rejects create without command", async () => {
    const r = await execute({ action: "create", name: "x", type: "agent", interval_seconds: 120 });
    assert.ok(hasError(r));
  });

  it("rejects create with type builtin (with hint)", async () => {
    const r = await execute({
      action: "create",
      name: "x",
      type: "builtin",
      command: "x",
      interval_seconds: 120,
    });
    assert.ok(hasError(r));
    assert.ok(hasHint(r));
  });

  it("rejects create without scheduling (with helpful hint)", async () => {
    const r = await execute({ action: "create", name: "x", type: "agent", command: "hi" });
    assert.ok(hasError(r));
    assert.ok(hasHint(r));
    assert.ok((r.hint as string).includes("interval_seconds"));
  });

  it("rejects at combined with interval", async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const r = await execute({
      action: "create",
      name: "x",
      type: "agent",
      command: "hi",
      at: future,
      interval_seconds: 120,
    });
    assert.ok(hasError(r));
  });

  it("rejects at combined with cron", async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const r = await execute({
      action: "create",
      name: "x",
      type: "agent",
      command: "hi",
      at: future,
      cron: "0 9 * * *",
    });
    assert.ok(hasError(r));
  });

  it("rejects cron combined with interval", async () => {
    const r = await execute({
      action: "create",
      name: "x",
      type: "agent",
      command: "hi",
      cron: "0 9 * * *",
      interval_seconds: 120,
    });
    assert.ok(hasError(r));
  });

  it("rejects at in the past", async () => {
    const r = await execute({
      action: "create",
      name: "past",
      type: "agent",
      command: "hi",
      at: "2000-01-01T00:00:00.000Z",
    });
    assert.ok(hasError(r));
    assert.ok(hasHint(r));
    assert.ok((r.hint as string).includes("already passed"));
  });

  it("rejects invalid at timestamp", async () => {
    const r = await execute({
      action: "create",
      name: "bad",
      type: "agent",
      command: "hi",
      at: "not-a-date",
    });
    assert.ok(hasError(r));
    assert.ok(hasHint(r));
  });

  it("rejects interval < 60 seconds", async () => {
    const r = await execute({
      action: "create",
      name: "fast",
      type: "agent",
      command: "hi",
      interval_seconds: 10,
    });
    assert.ok(hasError(r));
    assert.ok(hasHint(r));
  });

  it("rejects invalid cron expression", async () => {
    const r = await execute({
      action: "create",
      name: "bad-cron",
      type: "agent",
      command: "hi",
      cron: "bad cron expr here lol",
    });
    assert.ok(hasError(r));
    assert.ok(hasHint(r));
  });

  it("rejects builtin name collision", async () => {
    const r = await execute({
      action: "create",
      name: "heartbeat",
      type: "agent",
      command: "hi",
      interval_seconds: 120,
    });
    assert.ok(hasError(r));
    assert.ok(hasHint(r));
    assert.ok((r.hint as string).includes("different name"));
  });

  it("rejects duplicate name", async () => {
    await createTestPulse({ name: "dup" });
    const r = await execute({
      action: "create",
      name: "dup",
      type: "agent",
      command: "hi",
      interval_seconds: 120,
    });
    assert.ok(hasError(r));
    assert.ok(hasHint(r));
    assert.ok((r.hint as string).includes("delete"));
  });
});

describe("pulse tool - update (by id)", () => {
  it("updates command on agent pulse", async () => {
    const { id } = await createTestPulse({ name: "upd" });
    const r = await execute({ action: "update", id, command: "new command" });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.id, id);
    const show = await execute({ action: "show", id });
    assert.strictEqual((show.pulse as Record<string, unknown>).command, "new command");
  });

  it("updates interval and recalculates next_run_at", async () => {
    const { id } = await createTestPulse({ name: "upd2" });
    const before = await execute({ action: "show", id });
    await execute({ action: "update", id, interval_seconds: 3600 });
    const after = await execute({ action: "show", id });
    const bNext = (before.pulse as Record<string, unknown>).next_run_at as string;
    const aNext = (after.pulse as Record<string, unknown>).next_run_at as string;
    assert.notStrictEqual(bNext, aNext);
  });

  it("returns id and name in update response", async () => {
    const { id, name } = await createTestPulse({ name: "upd3" });
    const r = await execute({ action: "update", id, interval_seconds: 600 });
    assert.strictEqual(r.id, id);
    assert.strictEqual(r.name, name);
    assert.ok(r.next_run_at);
  });

  it("rejects update without id (with hint)", async () => {
    const r = await execute({ action: "update", command: "x" });
    assert.ok(hasError(r));
    assert.ok(hasHint(r));
    assert.ok((r.hint as string).includes("list"));
  });

  it("rejects update on nonexistent id", async () => {
    const r = await execute({ action: "update", id: 99999, command: "x" });
    assert.ok(hasError(r));
  });

  it("rejects changing command of builtin by id", async () => {
    const list = await execute({ action: "list" });
    const hb = (list.pulses as Record<string, unknown>[]).find((p) => p.name === "heartbeat");
    const r = await execute({ action: "update", id: hb?.id, command: "new" });
    assert.ok(hasError(r));
    assert.ok(hasHint(r));
    assert.ok((r.hint as string).includes("interval"));
  });

  it("rejects interval < 60s on update", async () => {
    const { id } = await createTestPulse({ name: "upd4" });
    const r = await execute({ action: "update", id, interval_seconds: 5 });
    assert.ok(hasError(r));
  });
});

describe("pulse tool - enable/disable (by id)", () => {
  it("disables a pulse by id", async () => {
    const { id, name } = await createTestPulse({ name: "tog" });
    const r = await execute({ action: "disable", id });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.id, id);
    assert.strictEqual(r.name, name);
    assert.strictEqual(r.enabled, false);
  });

  it("enables a disabled pulse by id", async () => {
    const { id } = await createTestPulse({ name: "tog2" });
    await execute({ action: "disable", id });
    const r = await execute({ action: "enable", id });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.enabled, true);
  });

  it("rejects enable without id (with hint)", async () => {
    const r = await execute({ action: "enable" });
    assert.ok(hasError(r));
    assert.ok(hasHint(r));
  });

  it("rejects enable for nonexistent id", async () => {
    const r = await execute({ action: "enable", id: 99999 });
    assert.ok(hasError(r));
  });
});

describe("pulse tool - delete (by id)", () => {
  it("deletes a user-created pulse by id", async () => {
    const { id } = await createTestPulse({ name: "del" });
    const r = await execute({ action: "delete", id });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.id, id);
    const show = await execute({ action: "show", id });
    assert.ok(hasError(show));
  });

  it("rejects deleting builtin pulse by id (with disable hint)", async () => {
    const list = await execute({ action: "list" });
    const hb = (list.pulses as Record<string, unknown>[]).find((p) => p.name === "heartbeat");
    const r = await execute({ action: "delete", id: hb?.id });
    assert.ok(hasError(r));
    assert.ok(hasHint(r));
    assert.ok((r.hint as string).includes("disable"));
  });

  it("rejects deleting nonexistent id", async () => {
    const r = await execute({ action: "delete", id: 99999 });
    assert.ok(hasError(r));
  });

  it("rejects deleting a running pulse (with id-based disable hint)", async () => {
    const { id } = await createTestPulse({ name: "running" });
    db.prepare(
      "UPDATE pulses SET running = 1, started_at = '2026-01-01T00:00:00.000Z' WHERE id = ?",
    ).run(id);
    const r = await execute({ action: "delete", id });
    assert.ok(hasError(r));
    assert.ok(hasHint(r));
    assert.ok((r.hint as string).includes("disable"));
    assert.ok((r.hint as string).includes(String(id)));
  });

  it("rejects delete without id", async () => {
    const r = await execute({ action: "delete" });
    assert.ok(hasError(r));
    assert.ok(hasHint(r));
  });
});

describe("pulse tool - misc", () => {
  it("rejects unknown action (with valid actions hint)", async () => {
    const r = await execute({ action: "explode" });
    assert.ok(hasError(r));
    assert.ok(hasHint(r));
    assert.ok((r.hint as string).includes("list"));
  });

  it("rejects empty action", async () => {
    const r = await execute({ action: "" });
    assert.ok(hasError(r));
    assert.ok(hasHint(r));
  });
});
