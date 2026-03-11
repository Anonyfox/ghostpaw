import { strictEqual } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  initSkillEventsTables,
  initSkillFragmentsTables,
  resetGitAvailableCache,
} from "../../core/skills/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { handleTrain } from "./handle_train.ts";

let db: DatabaseHandle;
let workspace: string;

beforeEach(async () => {
  resetGitAvailableCache();
  db = await openTestDatabase();
  initSkillEventsTables(db);
  initSkillFragmentsTables(db);
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-tg-train-"));
  mkdirSync(join(workspace, "skills"), { recursive: true });
  process.env.GHOSTPAW_WORKSPACE = workspace;
});

afterEach(() => {
  db.close();
  rmSync(workspace, { recursive: true, force: true });
  delete process.env.GHOSTPAW_WORKSPACE;
});

describe("handleTrain", () => {
  it("prompts for skill name when none provided", async () => {
    let sent = "";
    const deps = {
      db,
      isAllowed: () => true,
      sendMessage: async (_: number, text: string) => {
        sent = text;
      },
    };
    await handleTrain(deps, 123);
    strictEqual(sent, "No skills available for training.");
  });

  it("returns not found for missing skill", async () => {
    let sent = "";
    const deps = {
      db,
      isAllowed: () => true,
      sendMessage: async (_: number, text: string) => {
        sent = text;
      },
    };
    await handleTrain(deps, 123, "nonexistent");
    strictEqual(sent, 'Skill "nonexistent" not found.');
  });
});
