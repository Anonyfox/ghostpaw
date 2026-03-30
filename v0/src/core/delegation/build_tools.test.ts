import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import type { RuntimeContext, SoulIds } from "../../runtime.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { openMemorySoulsDatabase } from "../db/open_souls.ts";
import { bootstrapSouls } from "../souls/bootstrap.ts";
import { createDelegationTools } from "./build_tools.ts";

let db: DatabaseHandle;
let soulsDb: DatabaseHandle;
let soulIds: SoulIds;
let ctx: RuntimeContext;

beforeEach(() => {
  db = openMemoryDatabase();
  soulsDb = openMemorySoulsDatabase();
  soulIds = bootstrapSouls(soulsDb);
  ctx = {
    homePath: "/tmp/test",
    workspace: "/tmp/test",
    db,
    codexDb: db,
    affinityDb: db,
    soulsDb,
    config: {
      model: "test-model",
      model_small: "test-model-small",
      delegation_timeout_ms: 60_000,
    },
    soulIds,
  } as RuntimeContext;
});

afterEach(() => {
  soulsDb.close();
  db.close();
});

describe("createDelegationTools", () => {
  it("returns exactly two tools: ask_mentor and delegate", () => {
    const tools = createDelegationTools(ctx, "/tmp/test");
    assert.strictEqual(tools.length, 2);

    const names = tools.map((t) => t.name);
    assert.ok(names.includes("ask_mentor"));
    assert.ok(names.includes("delegate"));
  });

  it("both tools have non-empty descriptions", () => {
    const tools = createDelegationTools(ctx, "/tmp/test");

    for (const tool of tools) {
      assert.ok(tool.description.length > 50, `${tool.name} should have a substantive description`);
    }
  });
});
