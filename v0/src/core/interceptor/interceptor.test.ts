import assert from "node:assert";
import { describe, it } from "node:test";
import { addMessage } from "../chat/messages.ts";
import { createSession } from "../chat/session.ts";
import type { InterceptorConfig } from "../config/config.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { runInterceptor } from "./interceptor.ts";
import { createSubsystemRegistry } from "./registry.ts";

const stubRun = async () => ({ sessionId: 0, summary: "", succeeded: false });

describe("runInterceptor", () => {
  it("returns empty when disabled", async () => {
    const db = openMemoryDatabase();
    const session = createSession(db, "m", "p");
    addMessage(db, session.id, "user", "hello");

    const config: InterceptorConfig = { enabled: false, subsystems: {} };
    const registry = createSubsystemRegistry();

    const entries = await runInterceptor({
      chatDb: db,
      subsystemDbs: new Map(),
      registry,
      config,
      sessionId: session.id,
      triggerMessageId: 1,
      modelSmall: "m-small",
    });

    assert.strictEqual(entries.length, 0);
    db.close();
  });

  it("returns empty when no subsystems registered", async () => {
    const db = openMemoryDatabase();
    const session = createSession(db, "m", "p");
    addMessage(db, session.id, "user", "hello");

    const config: InterceptorConfig = { enabled: true, subsystems: {} };
    const registry = createSubsystemRegistry();

    const entries = await runInterceptor({
      chatDb: db,
      subsystemDbs: new Map(),
      registry,
      config,
      sessionId: session.id,
      triggerMessageId: 1,
      modelSmall: "m-small",
    });

    assert.strictEqual(entries.length, 0);
    db.close();
  });

  it("returns empty when subsystem is disabled in config", async () => {
    const db = openMemoryDatabase();
    const session = createSession(db, "m", "p");
    addMessage(db, session.id, "user", "hello");

    const config: InterceptorConfig = {
      enabled: true,
      subsystems: {
        test: { enabled: false, lookback: 3, max_iterations: 15, timeout_ms: 5000 },
      },
    };
    const registry = createSubsystemRegistry();
    registry.register({
      name: "test",
      defaultLookback: 3,
      defaultTimeoutMs: 5000,
      run: stubRun,
    });

    const entries = await runInterceptor({
      chatDb: db,
      subsystemDbs: new Map([["test", db]]),
      registry,
      config,
      sessionId: session.id,
      triggerMessageId: 1,
      modelSmall: "m-small",
    });

    assert.strictEqual(entries.length, 0);
    db.close();
  });
});
