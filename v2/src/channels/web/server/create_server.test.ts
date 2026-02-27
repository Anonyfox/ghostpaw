import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initSecretsTable } from "../../../core/secrets/index.ts";
import type { DatabaseHandle } from "../../../lib/index.ts";
import { openTestDatabase } from "../../../lib/index.ts";
import { createWebServer } from "./create_server.ts";

const VALID_HASH = `${"a".repeat(64)}:${"b".repeat(128)}`;

describe("createWebServer", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initSecretsTable(db);
  });

  afterEach(() => {
    db.close();
  });

  it("throws when passwordHash is empty", () => {
    assert.throws(
      () => createWebServer({ port: 0, passwordHash: "", clientJs: "", bootstrapCss: "", db }),
      { message: /WEB_UI_PASSWORD/ },
    );
  });

  it("returns a Server instance with valid config", () => {
    const server = createWebServer({
      port: 0,
      passwordHash: VALID_HASH,
      clientJs: "console.log('hi')",
      bootstrapCss: "body{}",
      db,
    });
    assert.ok(server);
    assert.equal(typeof server.listen, "function");
    assert.equal(typeof server.close, "function");
  });

  it("does not listen on creation", () => {
    const server = createWebServer({
      port: 0,
      passwordHash: VALID_HASH,
      clientJs: "",
      bootstrapCss: "",
      db,
    });
    assert.equal(server.listening, false);
  });
});
