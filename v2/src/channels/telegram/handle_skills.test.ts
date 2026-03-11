import { strictEqual } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { checkpoint, dropSkillFragment } from "../../core/skills/api/write/index.ts";
import {
  initSkillEventsTables,
  initSkillFragmentsTables,
  resetGitAvailableCache,
} from "../../core/skills/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { handleSkills } from "./handle_skills.ts";

let db: DatabaseHandle;
let workspace: string;

beforeEach(async () => {
  resetGitAvailableCache();
  db = await openTestDatabase();
  initSkillEventsTables(db);
  initSkillFragmentsTables(db);
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

  it("appends fragment summary when fragments exist", async () => {
    dropSkillFragment(db, "quest", "q-1", "Retry pattern observed");
    dropSkillFragment(db, "session", "s-1", "Import convention noted");

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
    strictEqual(sent.includes("*Fragments*"), true);
    strictEqual(sent.includes("2 pending"), true);
    strictEqual(sent.includes("quest"), true);
    strictEqual(sent.includes("session"), true);
  });
});
