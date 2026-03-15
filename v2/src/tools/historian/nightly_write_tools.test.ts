import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initTrailTables } from "../../core/trail/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { createHistorianNightlyTools } from "./create_historian_nightly_tools.ts";

let db: DatabaseHandle;
const ctx = { model: "test", provider: "test" } as const;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

afterEach(() => db.close());

function findTool(name: string) {
  const tools = createHistorianNightlyTools(db);
  const tool = tools.find((t) => t.name === name);
  ok(tool, `tool "${name}" should exist`);
  return tool;
}

describe("update_open_loops tool", () => {
  it("forwards sourceType and sourceId through JSON parsing", async () => {
    const tool = findTool("update_open_loops");
    const result = (await tool.execute({
      args: {
        create: JSON.stringify([
          {
            description: "Quest thread: deployment blocked",
            sourceType: "quest",
            sourceId: "42",
            significance: 0.8,
            recommendedAction: "revisit",
          },
        ]),
      },
      ctx,
    })) as Record<string, unknown>[];

    strictEqual(result.length, 1);
    const loop = result[0] as Record<string, unknown>;
    strictEqual(loop.sourceType, "quest");
    strictEqual(loop.sourceId, "42");
    strictEqual(loop.significance, 0.8);
    strictEqual(loop.recommendedAction, "revisit");
  });

  it("creates loops without source attribution", async () => {
    const tool = findTool("update_open_loops");
    const result = (await tool.execute({
      args: {
        create: JSON.stringify([{ description: "Organic thread", significance: 0.5 }]),
      },
      ctx,
    })) as Record<string, unknown>[];

    strictEqual(result.length, 1);
    strictEqual(result[0].sourceType, null);
    strictEqual(result[0].sourceId, null);
  });

  it("dismisses loops by comma-separated IDs", async () => {
    const tool = findTool("update_open_loops");
    const created = (await tool.execute({
      args: {
        create: JSON.stringify([
          { description: "A", significance: 0.5 },
          { description: "B", significance: 0.5 },
        ]),
      },
      ctx,
    })) as Record<string, unknown>[];

    const ids = created.map((l) => (l as Record<string, unknown>).id).join(",");
    await tool.execute({ args: { dismiss: ids }, ctx });

    const rows = db
      .prepare("SELECT status FROM trail_open_loops WHERE status = 'dismissed'")
      .all() as Record<string, unknown>[];
    strictEqual(rows.length, 2);
  });
});

describe("write_chronicle tool", () => {
  it("creates a chronicle entry", async () => {
    const tool = findTool("write_chronicle");
    const result = (await tool.execute({
      args: {
        date: "2026-03-15",
        title: "Test day",
        narrative: "A quiet day of testing.",
      },
      ctx,
    })) as Record<string, unknown>;

    strictEqual(result.title, "Test day");
    ok(result.id);
  });
});

describe("update_trail_state tool", () => {
  it("creates a chapter", async () => {
    const tool = findTool("update_trail_state");
    const result = (await tool.execute({
      args: {
        create_chapter_label: "Phase One",
        create_chapter_momentum: "rising",
      },
      ctx,
    })) as Record<string, unknown>;

    const chapter = result.chapter as Record<string, unknown>;
    strictEqual(chapter.label, "Phase One");
    strictEqual(chapter.momentum, "rising");
  });
});
