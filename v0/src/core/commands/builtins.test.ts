import assert from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { addMessage } from "../chat/messages.ts";
import { createSession } from "../chat/session.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { clearSecretRegistry } from "../settings/scrub.ts";
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
  clearSecretRegistry();
});

afterEach(() => {
  db.close();
  rmSync(tmpDir, { recursive: true, force: true });
  clearSecretRegistry();
  delete process.env.GHOSTPAW_MODEL;
  delete process.env.GHOSTPAW_MODEL_SMALL;
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
  it("shows default model when no args and no session", async () => {
    process.env.GHOSTPAW_MODEL = "default-model";
    const result = await registry.execute("model", "", ctx());
    assert.ok(result.text.includes("default-model"));
  });

  it("changes model and updates settings", async () => {
    const session = createSession(db, "old", "p");
    const result = await registry.execute("model", "new-model", ctx(session.id));
    assert.ok(result.text.includes("new-model"));
    assert.strictEqual(result.action!.type, "model_changed");
    assert.strictEqual(process.env.GHOSTPAW_MODEL, "new-model");
  });
});

describe("config command", () => {
  it("lists config values with no args", async () => {
    const result = await registry.execute("config", "", ctx());
    assert.ok(result.text.length > 0);
  });

  it("gets a config value", async () => {
    process.env.GHOSTPAW_MODEL = "test-model";
    const result = await registry.execute("config", "model", ctx());
    assert.ok(result.text.includes("test-model"));
  });

  it("sets a config value", async () => {
    const result = await registry.execute("config", "model gpt-5.4", ctx());
    assert.ok(result.text.includes("Set GHOSTPAW_MODEL"));
    assert.strictEqual(process.env.GHOSTPAW_MODEL, "gpt-5.4");
  });
});

describe("secret command", () => {
  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("lists secrets with no args", async () => {
    const result = await registry.execute("secret", "", ctx());
    assert.ok(typeof result.text === "string");
  });

  it("sets a secret value", async () => {
    const result = await registry.execute("secret", "ANTHROPIC_API_KEY sk-ant-test1234", ctx());
    assert.ok(result.text.includes("Set ANTHROPIC_API_KEY"));
    assert.strictEqual(process.env.ANTHROPIC_API_KEY, "sk-ant-test1234");
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
