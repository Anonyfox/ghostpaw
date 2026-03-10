import { strictEqual } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { resetGitAvailableCache } from "../../core/skills/git.ts";
import { checkpoint, initSkillEventsTables } from "../../core/skills/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { handleSkills } from "./handle_skills.ts";

let db: DatabaseHandle;
let workspace: string;

beforeEach(async () => {
  resetGitAvailableCache();
  db = await openTestDatabase();
  initSkillEventsTables(db);
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-tg-skills-"));
  mkdirSync(join(workspace, "skills"), { recursive: true });
  process.env.GHOSTPAW_WORKSPACE = workspace;
});

afterEach(() => {
  db.close();
  rmSync(workspace, { recursive: true, force: true });
  delete process.env.GHOSTPAW_WORKSPACE;
});

describe("handleSkills", () => {
  it("sends 'No skills found' when empty", async () => {
    let sent = "";
    const deps = {
      db,
      isAllowed: () => true,
      sendMessage: async (_: number, text: string) => {
        sent = text;
      },
    };
    await handleSkills(deps, 123);
    strictEqual(sent, "No skills found.");
  });

  it("lists skills with tier and rank", async () => {
    const dir = join(workspace, "skills", "deploy");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "SKILL.md"),
      "---\nname: deploy\ndescription: Deploy stuff.\n---\n# deploy",
    );
    checkpoint(workspace, ["deploy"], "init");

    let sent = "";
    const deps = {
      db,
      isAllowed: () => true,
      sendMessage: async (_: number, text: string) => {
        sent = text;
      },
    };
    await handleSkills(deps, 123);
    strictEqual(sent.includes("*deploy*"), true);
    strictEqual(sent.includes("Apprentice"), true);
  });
});
