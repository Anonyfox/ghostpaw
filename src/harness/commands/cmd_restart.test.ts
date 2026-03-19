import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getConfig } from "../../core/config/api/read/index.ts";
import { initConfigTable } from "../../core/config/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { executeRestart, resetCooldown } from "./cmd_restart.ts";
import type { CommandContext } from "./types.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initConfigTable(db);
  resetCooldown();
});

afterEach(() => {
  db.close();
});

function makeCtx(overrides?: Partial<CommandContext>): CommandContext {
  return {
    db,
    sessionId: 1,
    sessionKey: "web:1",
    configuredKeys: new Set(),
    workspace: "/tmp/test-gp",
    version: "1.2.3",
    ...overrides,
  };
}

describe("executeRestart", () => {
  it("returns restart action on success", async () => {
    const result = await executeRestart(makeCtx(), "");
    strictEqual(result.action?.type, "restart");
    ok(result.text.includes("Restarting"));
  });

  it("enforces 30s cooldown on repeated calls", async () => {
    const first = await executeRestart(makeCtx(), "");
    strictEqual(first.action?.type, "restart");

    const second = await executeRestart(makeCtx(), "");
    strictEqual(second.action, undefined);
    ok(second.text.includes("cooldown"));
  });

  it("persists restart context to config", async () => {
    await executeRestart(makeCtx({ sessionKey: "telegram:123" }), "");
    const raw = getConfig(db, "_restart_context");
    ok(typeof raw === "string", "restart context should be persisted");
    const parsed = JSON.parse(raw);
    strictEqual(parsed.channel, "telegram");
    strictEqual(parsed.sessionKey, "telegram:123");
    ok(typeof parsed.timestamp === "number");
  });
});
