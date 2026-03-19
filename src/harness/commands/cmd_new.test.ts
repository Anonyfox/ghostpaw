import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getSession } from "../../core/chat/api/read/index.ts";
import { createSession } from "../../core/chat/api/write/index.ts";
import { initChatTables } from "../../core/chat/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { executeNew } from "./cmd_new.ts";
import type { CommandContext } from "./types.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("executeNew", () => {
  it("creates a new session and returns new_session action", async () => {
    const ctx: CommandContext = {
      db,
      sessionId: 0,
      sessionKey: "old",
      configuredKeys: new Set(),
      workspace: ".",
      version: "0.0.0-dev",
    };
    const result = await executeNew(ctx, "");

    ok(result.action);
    strictEqual(result.action!.type, "new_session");
    ok(result.text.includes("New session"));

    const newSession = getSession(db, result.action!.sessionId);
    ok(newSession);
    strictEqual(newSession!.purpose, "chat");
  });

  it("closes the current session before creating a new one", async () => {
    const existing = createSession(db, "test:existing", { purpose: "chat" });
    const ctx: CommandContext = {
      db,
      sessionId: existing.id as number,
      sessionKey: "test:existing",
      configuredKeys: new Set(),
      workspace: ".",
      version: "0.0.0-dev",
    };

    await executeNew(ctx, "");

    const closed = getSession(db, existing.id as number);
    ok(closed?.closedAt);
  });

  it("handles nonexistent sessionId gracefully", async () => {
    const ctx: CommandContext = {
      db,
      sessionId: 999,
      sessionKey: "missing",
      configuredKeys: new Set(),
      workspace: ".",
      version: "0.0.0-dev",
    };
    const result = await executeNew(ctx, "");
    ok(result.action);
    strictEqual(result.action!.type, "new_session");
  });
});
