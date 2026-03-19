import { ok, rejects, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { ChatFactory } from "../../core/chat/api/write/index.ts";
import { initChatTables } from "../../core/chat/runtime/index.ts";

import { initConfigTable } from "../../core/config/runtime/index.ts";
import { initMemoryTable } from "../../core/memory/runtime/index.ts";
import { MANDATORY_SOUL_IDS } from "../../core/souls/api/read/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../../core/souls/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import type { RewriteEssenceInput } from "./rewrite_essence.ts";
import { rewriteEssence } from "./rewrite_essence.ts";

async function setup(): Promise<DatabaseHandle> {
  const db = await openTestDatabase();
  initSoulsTables(db);
  initChatTables(db);
  initMemoryTable(db);
  initConfigTable(db);
  ensureMandatorySouls(db);
  return db;
}

function mockChatFactory(response: string): ChatFactory {
  return ((_model: string) => {
    const instance: Record<string, unknown> = {
      system() {
        return instance;
      },
      user() {
        return instance;
      },
      assistant() {
        return instance;
      },
      addTool() {
        return instance;
      },
      get messages() {
        return [];
      },
      async generate() {
        return response;
      },
      async *stream() {
        yield response;
      },
      get lastResult() {
        return {
          content: response,
          usage: {
            inputTokens: 100,
            outputTokens: 50,
            reasoningTokens: 0,
            cachedTokens: 0,
            totalTokens: 150,
          },
          cost: { estimatedUsd: 0.001 },
          model: "test-model",
          finishReason: "stop",
          timing: { totalMs: 100 },
          provider: "test",
          cached: false,
          iterations: 1,
        };
      },
    };
    return instance;
  }) as unknown as ChatFactory;
}

const testInput: RewriteEssenceInput = {
  soulName: "JS Engineer",
  soulId: 2,
  currentEssence: "A builder who trusts tools over assumptions.",
  description: "Expert JavaScript engineer",
  promotedTraits: [
    { principle: "Always check return values", provenance: "Observed in 5 delegation runs" },
  ],
  consolidatedTraits: [
    {
      mergedPrinciple: "Verify before acting",
      sourcePrinciples: ["Check inputs", "Validate outputs"],
    },
  ],
  carriedTraits: [{ principle: "Small steps, verified each time" }],
};

describe("rewriteEssence", () => {
  it("returns rewritten essence without rolling cost into the parent session", async () => {
    const db = await setup();

    const now = Date.now();
    db.prepare(
      `INSERT INTO sessions (id, key, purpose, model, created_at, last_active_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(500, "test:parent", "chat", "test-model", now, now);

    const factory = mockChatFactory("Rewritten essence with evolved understanding.");
    const result = await rewriteEssence(
      db,
      "/tmp/ghostpaw-test",
      500,
      testInput,
      "test-model",
      factory,
    );

    ok(result.includes("Rewritten essence"));

    const parent = db.prepare("SELECT cost_usd FROM sessions WHERE id = 500").get() as {
      cost_usd: number;
    };
    strictEqual(parent.cost_usd, 0);

    const system = db
      .prepare("SELECT cost_usd FROM sessions WHERE key LIKE 'system:essence-rewrite:%'")
      .get() as { cost_usd: number };
    ok(system.cost_usd > 0);
  });

  it("creates session tagged with mentor soulId and closes it", async () => {
    const db = await setup();

    const now = Date.now();
    db.prepare(
      `INSERT INTO sessions (id, key, purpose, model, created_at, last_active_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(501, "test:parent2", "chat", "test-model", now, now);

    const factory = mockChatFactory("Updated essence.");
    await rewriteEssence(db, "/tmp/ghostpaw-test", 501, testInput, "test-model", factory);

    const sessions = db
      .prepare("SELECT * FROM sessions WHERE key LIKE 'system:essence-rewrite:%'")
      .all() as { closed_at: number | null; soul_id: number | null }[];
    ok(sessions.length > 0);
    for (const s of sessions) {
      ok(s.closed_at !== null);
      strictEqual(s.soul_id, MANDATORY_SOUL_IDS.mentor);
    }
  });

  it("rejects empty response", async () => {
    const db = await setup();

    const now = Date.now();
    db.prepare(
      `INSERT INTO sessions (id, key, purpose, model, created_at, last_active_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(502, "test:parent3", "chat", "test-model", now, now);

    const factory = mockChatFactory("");
    await rejects(
      () => rewriteEssence(db, "/tmp/ghostpaw-test", 502, testInput, "test-model", factory),
      /empty or error/i,
    );
  });
});
