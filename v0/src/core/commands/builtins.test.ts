import assert from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { addMessage } from "../chat/messages.ts";
import { createSession } from "../chat/session.ts";
import { writeConfig } from "../config/config.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { registerBuiltins } from "./builtins.ts";
import type { CommandRegistry } from "./registry.ts";
import { createRegistry } from "./registry.ts";
import type { CommandCtx } from "./types.ts";

let db: DatabaseHandle;
let tmpDir: string;
let registry: CommandRegistry;

beforeEach(() => {
  db = openMemoryDatabase();
  tmpDir = mkdtempSync(join(tmpdir(), "ghostpaw-cmd-test-"));
  registry = createRegistry();
  registerBuiltins(registry);
});

afterEach(() => {
  db.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

function ctx(sessionId: number | null = null): CommandCtx {
  return { db, homePath: tmpDir, sessionId };
}

describe("help command", () => {
  it("lists available commands", async () => {
    const result = await registry.execute("help", "", ctx());
    assert.ok(result.text.includes("Available commands"));
    assert.ok(result.text.includes("/help"));
    assert.ok(result.text.includes("/new"));
  });

  it("shows details for a specific command", async () => {
    const result = await registry.execute("help", "model", ctx());
    assert.ok(result.text.includes("model"));
    assert.ok(result.text.includes("Show or change"));
  });
});

describe("new command", () => {
  it("creates a new session", async () => {
    writeConfig(tmpDir, { model: "test-model", system_prompt: "test", api_keys: {} });
    const result = await registry.execute("new", "", ctx());
    assert.ok(result.text.includes("Created session"));
    assert.ok(result.action);
    assert.strictEqual(result.action!.type, "new_session");
  });
});

describe("sessions command", () => {
  it("reports no sessions when empty", async () => {
    const result = await registry.execute("sessions", "", ctx());
    assert.ok(result.text.includes("No sessions"));
  });

  it("lists existing sessions", async () => {
    createSession(db, "m1", "p1");
    const result = await registry.execute("sessions", "", ctx());
    assert.ok(result.text.includes("m1"));
  });
});

describe("model command", () => {
  it("shows current model when no args", async () => {
    writeConfig(tmpDir, { model: "default-model", system_prompt: "p", api_keys: {} });
    const result = await registry.execute("model", "", ctx());
    assert.ok(result.text.includes("default-model"));
  });

  it("changes model and updates config", async () => {
    writeConfig(tmpDir, { model: "old", system_prompt: "p", api_keys: {} });
    const session = createSession(db, "old", "p");
    const result = await registry.execute("model", "new-model", ctx(session.id));
    assert.ok(result.text.includes("new-model"));
    assert.strictEqual(result.action!.type, "model_changed");
  });
});

describe("undo command", () => {
  it("removes last exchange", async () => {
    const session = createSession(db, "m", "p");
    addMessage(db, session.id, "user", "hello");
    addMessage(db, session.id, "assistant", "hi");

    const result = await registry.execute("undo", "", ctx(session.id));
    assert.ok(result.text.includes("Removed"));
    assert.strictEqual(result.action!.type, "undo");
  });

  it("handles empty session", async () => {
    const session = createSession(db, "m", "p");
    const result = await registry.execute("undo", "", ctx(session.id));
    assert.ok(result.text.includes("No messages"));
  });
});

describe("quit command", () => {
  it("returns quit action", async () => {
    const result = await registry.execute("quit", "", ctx());
    assert.strictEqual(result.action!.type, "quit");
  });
});
