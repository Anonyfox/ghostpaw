import { ok, throws } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initChatTables } from "../core/chat/index.ts";
import { initConfigTable } from "../core/config/index.ts";
import { initHowlTables } from "../core/howl/index.ts";
import { initMemoryTable } from "../core/memory/index.ts";
import { initPackTables } from "../core/pack/index.ts";
import { initQuestTables } from "../core/quests/index.ts";
import { ensureMandatorySouls, initSoulsTables, MANDATORY_SOUL_IDS } from "../core/souls/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/index.ts";
import { assembleContext } from "./context.ts";

let db: DatabaseHandle;
let workspace: string;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initSoulsTables(db);
  initMemoryTable(db);
  initConfigTable(db);
  initPackTables(db);
  initQuestTables(db);
  initHowlTables(db);
  ensureMandatorySouls(db);
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-ctx-"));
});

afterEach(() => {
  db.close();
  rmSync(workspace, { recursive: true, force: true });
});

function makeSkill(name: string, description: string): void {
  const dir = join(workspace, "skills", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`,
    "utf-8",
  );
}

describe("assembleContext", () => {
  it("starts with the soul's rendered markdown", () => {
    const result = assembleContext(db, workspace);
    ok(result.startsWith("# Ghostpaw"));
    ok(result.includes("the coordinator"));
  });

  it("includes soul traits", () => {
    const result = assembleContext(db, workspace);
    ok(result.includes("## Traits"));
    ok(result.includes("Name what you're about to do before doing it."));
  });

  it("throws actionable error when soul ID is invalid", () => {
    throws(
      () => assembleContext(db, workspace, 9999),
      (err: Error) => {
        ok(err.message.includes("9999"));
        ok(err.message.includes("bootstrap"));
        return true;
      },
    );
  });

  it("defaults to Ghostpaw soul when no soulId provided", () => {
    const result = assembleContext(db, workspace);
    ok(result.includes("# Ghostpaw"));
  });

  it("accepts soulId override for specialist souls", () => {
    const result = assembleContext(db, workspace, MANDATORY_SOUL_IDS["js-engineer"]);
    ok(result.includes("# JS Engineer"));
  });

  it("includes environment section with current date", () => {
    const result = assembleContext(db, workspace);
    ok(result.includes("## Environment"));
    ok(result.includes("Current date:"));
    const year = new Date().getFullYear().toString();
    ok(result.includes(year));
  });

  it("does not include Known Context or Quests sections", () => {
    const result = assembleContext(db, workspace);
    ok(!result.includes("## Known Context"));
    ok(!result.includes("## Quests"));
  });

  it("includes tool guidance section", () => {
    const result = assembleContext(db, workspace);
    ok(result.includes("## Tools"));
    ok(result.includes("delegate to the Warden"));
  });

  it("sections are separated by double newlines", () => {
    const result = assembleContext(db, workspace);
    const sections = result.split("\n\n");
    ok(sections.length >= 3);
  });

  it("includes Skills section when skills exist", () => {
    makeSkill("deploy", "Deploy the app.");
    makeSkill("testing", "Run test suite.");
    const result = assembleContext(db, workspace);
    ok(result.includes("## Skills"));
    ok(result.includes("2 skills"));
    ok(result.includes("skills/deploy/: Deploy the app."));
    ok(result.includes("skills/testing/: Run test suite."));
  });

  it("omits Skills section when no skills exist", () => {
    const result = assembleContext(db, workspace);
    ok(!result.includes("## Skills"));
  });

  it("Skills section appears before Tools section", () => {
    makeSkill("deploy", "Deploy the app.");
    const result = assembleContext(db, workspace);
    const skillsIdx = result.indexOf("## Skills");
    const toolsIdx = result.indexOf("## Tools");
    ok(skillsIdx > 0);
    ok(toolsIdx > skillsIdx);
  });

  it("mentor context includes specialist tool guidance", () => {
    const result = assembleContext(db, workspace, MANDATORY_SOUL_IDS.mentor);
    ok(result.includes("specialist tools for soul development"));
    ok(result.includes("review_soul"));
    ok(result.includes("exclusive to you"));
  });

  it("trainer context includes specialist tool guidance", () => {
    const result = assembleContext(db, workspace, MANDATORY_SOUL_IDS.trainer);
    ok(result.includes("specialist tools for skill development"));
    ok(result.includes("review_skills"));
    ok(result.includes("exclusive to you"));
  });

  it("base soul context does not include specialist guidance", () => {
    const result = assembleContext(db, workspace);
    ok(!result.includes("specialist tools for soul development"));
    ok(!result.includes("specialist tools for skill development"));
  });

  it("warden context includes soul, environment, and tool guidance", () => {
    const result = assembleContext(db, workspace, MANDATORY_SOUL_IDS.warden);
    ok(result.includes("# Warden"));
    ok(result.includes("## Environment"));
    ok(result.includes("## Tools"));
    ok(result.includes("persistence keeper"));
  });

  it("warden context does NOT include Known Context, Quests, or Skills", () => {
    makeSkill("deploy", "Deploy the app.");
    const result = assembleContext(db, workspace, MANDATORY_SOUL_IDS.warden);
    ok(!result.includes("## Known Context"));
    ok(!result.includes("## Quests"));
    ok(!result.includes("## Skills"));
    ok(!result.includes("## Budget"));
  });

  it("coordinator context mentions delegation to Warden", () => {
    const result = assembleContext(db, workspace);
    ok(result.includes("delegate to the Warden"));
  });

  it("coordinator context mentions delegation to Chamberlain", () => {
    const result = assembleContext(db, workspace);
    ok(result.includes("delegate to the Chamberlain"));
  });

  it("chamberlain context includes soul, environment, and tool guidance", () => {
    const result = assembleContext(db, workspace, MANDATORY_SOUL_IDS.chamberlain);
    ok(result.includes("# Chamberlain"));
    ok(result.includes("## Environment"));
    ok(result.includes("## Tools"));
    ok(result.includes("infrastructure governor"));
  });

  it("chamberlain context does NOT include Known Context, Quests, or Skills", () => {
    makeSkill("deploy", "Deploy the app.");
    const result = assembleContext(db, workspace, MANDATORY_SOUL_IDS.chamberlain);
    ok(!result.includes("## Known Context"));
    ok(!result.includes("## Quests"));
    ok(!result.includes("## Skills"));
    ok(!result.includes("## Budget"));
  });
});
