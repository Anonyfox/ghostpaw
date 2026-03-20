import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initSecretsTable, setProtectedSecret } from "../../core/secrets/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { isHashedPassword } from "../web/server/is_hashed_password.ts";
import { prepareWeb } from "./prepare_web.ts";

describe("prepareWeb", () => {
  let db: DatabaseHandle;
  const VERSION = "1.0.0-test";

  beforeEach(async () => {
    db = await openTestDatabase();
    initSecretsTable(db);
    delete process.env.WEB_UI_PASSWORD;
    delete process.env.WEB_UI_PORT;
    delete process.env.GHOSTPAW_DESKTOP;
  });

  afterEach(() => {
    db.close();
    delete process.env.WEB_UI_PASSWORD;
    delete process.env.WEB_UI_PORT;
    delete process.env.GHOSTPAW_DESKTOP;
  });

  it("returns null when no WEB_UI_PASSWORD exists anywhere", async () => {
    const result = await prepareWeb(db, VERSION);
    assert.equal(result, null);
  });

  it("reads password from DB and auto-hashes plain text", async () => {
    setProtectedSecret(db, "WEB_UI_PASSWORD", "my-secret-password");

    const result = await prepareWeb(db, VERSION);
    assert.ok(result);
    assert.ok(isHashedPassword(result.passwordHash), "password was hashed");

    const stored = db.prepare("SELECT value FROM secrets WHERE key = ?").get("WEB_UI_PASSWORD");
    assert.ok(isHashedPassword(stored!.value as string), "hash was persisted back to DB");
  });

  it("picks up WEB_UI_PASSWORD from env when not in DB", async () => {
    process.env.WEB_UI_PASSWORD = "from-env";

    const result = await prepareWeb(db, VERSION);
    assert.ok(result);
    assert.ok(isHashedPassword(result.passwordHash));

    const stored = db.prepare("SELECT value FROM secrets WHERE key = ?").get("WEB_UI_PASSWORD");
    assert.ok(stored, "value was persisted to DB");
    assert.ok(isHashedPassword(stored!.value as string), "persisted value is hashed");
  });

  it("passes through already-hashed password without re-hashing", async () => {
    const preHashed = `${"a".repeat(64)}:${"b".repeat(128)}`;
    setProtectedSecret(db, "WEB_UI_PASSWORD", preHashed);

    const result = await prepareWeb(db, VERSION);
    assert.ok(result);
    assert.equal(result.passwordHash, preHashed, "hash passed through unchanged");
  });

  it("returns correct port from WEB_UI_PORT env var", async () => {
    setProtectedSecret(db, "WEB_UI_PASSWORD", "test");
    process.env.WEB_UI_PORT = "8080";

    const result = await prepareWeb(db, VERSION);
    assert.ok(result);
    assert.equal(result.port, 8080);
  });

  it("defaults to port 3000 when WEB_UI_PORT is unset", async () => {
    setProtectedSecret(db, "WEB_UI_PASSWORD", "test");

    const result = await prepareWeb(db, VERSION);
    assert.ok(result);
    assert.equal(result.port, 3000);
  });

  it("returns version from argument", async () => {
    setProtectedSecret(db, "WEB_UI_PASSWORD", "test");

    const result = await prepareWeb(db, VERSION);
    assert.ok(result);
    assert.equal(result.version, "1.0.0-test");
  });

  it("returns host as 127.0.0.1 by default", async () => {
    setProtectedSecret(db, "WEB_UI_PASSWORD", "test");

    const result = await prepareWeb(db, VERSION);
    assert.ok(result);
    assert.equal(result.host, "127.0.0.1");
  });

  it("returns noAuth: false when not in desktop mode", async () => {
    setProtectedSecret(db, "WEB_UI_PASSWORD", "test");

    const result = await prepareWeb(db, VERSION);
    assert.ok(result);
    assert.equal(result.noAuth, false);
  });

  it("returns valid config with noAuth: true in desktop mode without password", async () => {
    process.env.GHOSTPAW_DESKTOP = "1";

    const result = await prepareWeb(db, VERSION);
    assert.ok(result, "desktop mode returns config even without password");
    assert.equal(result.noAuth, true);
    assert.equal(result.host, "127.0.0.1");
    assert.equal(result.passwordHash, "desktop-no-auth");
  });

  it("returns noAuth: true in desktop mode even with password set", async () => {
    process.env.GHOSTPAW_DESKTOP = "1";
    setProtectedSecret(db, "WEB_UI_PASSWORD", "test");

    const result = await prepareWeb(db, VERSION);
    assert.ok(result);
    assert.equal(result.noAuth, true);
    assert.ok(result.passwordHash !== "desktop-no-auth", "password was still hashed");
  });
});
