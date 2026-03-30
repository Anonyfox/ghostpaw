import assert from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { closeRuntime, initRuntime } from "./runtime.ts";

let homePath: string;

beforeEach(() => {
  homePath = mkdtempSync(join(tmpdir(), "ghostpaw-runtime-test-"));
});

afterEach(() => {
  rmSync(homePath, { recursive: true, force: true });
});

describe("initRuntime", () => {
  it("returns a fully populated RuntimeContext with all required fields", async () => {
    const ctx = await initRuntime(homePath, "/some/workspace");

    assert.strictEqual(ctx.homePath, homePath);
    assert.strictEqual(ctx.workspace, "/some/workspace");

    assert.ok(ctx.db, "db must be present");
    assert.ok(ctx.codexDb, "codexDb must be present");
    assert.ok(ctx.affinityDb, "affinityDb must be present");
    assert.ok(ctx.soulsDb, "soulsDb must be present");

    assert.ok(ctx.config, "config must be present");
    assert.strictEqual(typeof ctx.config.model, "string");
    assert.ok(ctx.config.model.length > 0);

    assert.ok(ctx.soulIds, "soulIds must be present");
    assert.ok(ctx.soulIds.ghostpaw > 0, "ghostpaw soul ID must be a positive number");
    assert.ok(ctx.soulIds.scribe > 0, "scribe soul ID must be a positive number");
    assert.ok(ctx.soulIds.innkeeper > 0, "innkeeper soul ID must be a positive number");
    assert.ok(ctx.soulIds.mentor > 0, "mentor soul ID must be a positive number");

    closeRuntime(ctx);
  });

  it("all 4 soul IDs are distinct", async () => {
    const ctx = await initRuntime(homePath, process.cwd());
    const ids = Object.values(ctx.soulIds);
    const unique = new Set(ids);
    assert.strictEqual(unique.size, 4);
    closeRuntime(ctx);
  });

  it("config has no system_prompt field — it was removed", async () => {
    const ctx = await initRuntime(homePath, process.cwd());
    assert.ok(!("system_prompt" in ctx.config), "Config must not have system_prompt");
    closeRuntime(ctx);
  });

  it("second initRuntime on the same home returns the same soul IDs (idempotent bootstrap)", async () => {
    const ctx1 = await initRuntime(homePath, process.cwd());
    const ids1 = { ...ctx1.soulIds };
    closeRuntime(ctx1);

    const ctx2 = await initRuntime(homePath, process.cwd());
    const ids2 = { ...ctx2.soulIds };
    closeRuntime(ctx2);

    assert.strictEqual(ids2.ghostpaw, ids1.ghostpaw);
    assert.strictEqual(ids2.scribe, ids1.scribe);
    assert.strictEqual(ids2.innkeeper, ids1.innkeeper);
    assert.strictEqual(ids2.mentor, ids1.mentor);
  });
});

describe("closeRuntime", () => {
  it("closes all DB handles without throwing", async () => {
    const ctx = await initRuntime(homePath, process.cwd());
    assert.doesNotThrow(() => closeRuntime(ctx));
  });
});
