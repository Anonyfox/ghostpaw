import { ok } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { assembleSystemPrompt } from "./context.js";

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "ghostpaw-ctx-"));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("assembleSystemPrompt", () => {
  it("returns a non-empty string even with no SOUL.md or skills", () => {
    const prompt = assembleSystemPrompt(workDir);
    ok(prompt.length > 0);
    ok(prompt.includes("ghostpaw"));
  });

  it("includes SOUL.md content when present", () => {
    writeFileSync(join(workDir, "SOUL.md"), "You are a helpful AI cat named Whiskers.");
    const prompt = assembleSystemPrompt(workDir);
    ok(prompt.includes("Whiskers"));
  });

  it("includes skill index with full paths and titles", () => {
    const skillsDir = join(workDir, "skills");
    mkdirSync(skillsDir);
    writeFileSync(join(skillsDir, "coding.md"), "# Coding\nYou are excellent at TypeScript.");
    writeFileSync(join(skillsDir, "writing.md"), "# Writing\nYou write clean prose.");

    const prompt = assembleSystemPrompt(workDir);
    ok(prompt.includes("skills/coding.md"));
    ok(prompt.includes("Coding"));
    ok(prompt.includes("skills/writing.md"));
    ok(prompt.includes("Writing"));
    ok(prompt.includes("2 skills"));
  });

  it("does not include full skill body content in prompt", () => {
    const skillsDir = join(workDir, "skills");
    mkdirSync(skillsDir);
    writeFileSync(join(skillsDir, "coding.md"), "# Coding\nYou are excellent at TypeScript.");

    const prompt = assembleSystemPrompt(workDir);
    ok(!prompt.includes("You are excellent at TypeScript"));
  });

  it("ignores non-.md files in skills/ directory", () => {
    const skillsDir = join(workDir, "skills");
    mkdirSync(skillsDir);
    writeFileSync(join(skillsDir, "coding.md"), "# Coding skill");
    writeFileSync(join(skillsDir, "notes.txt"), "This should be ignored");

    const prompt = assembleSystemPrompt(workDir);
    ok(prompt.includes("skills/coding.md"));
    ok(!prompt.includes("notes.txt"));
    ok(!prompt.includes("This should be ignored"));
  });

  it("includes budget summary when provided", () => {
    const prompt = assembleSystemPrompt(
      workDir,
      "Session: 5000 in + 2000 out = 7000 / 200000 (4%)",
    );
    ok(prompt.includes("7000"));
    ok(prompt.includes("200000"));
  });

  it("omits budget section when not provided", () => {
    const prompt = assembleSystemPrompt(workDir);
    ok(!prompt.includes("Budget"));
  });

  it("handles missing skills/ directory gracefully", () => {
    const prompt = assembleSystemPrompt(workDir);
    ok(prompt.length > 0);
    ok(!prompt.includes("## Skills"));
  });

  it("handles empty SOUL.md gracefully", () => {
    writeFileSync(join(workDir, "SOUL.md"), "");
    const prompt = assembleSystemPrompt(workDir);
    ok(prompt.length > 0);
  });

  it("sections are properly separated", () => {
    writeFileSync(join(workDir, "SOUL.md"), "I am a cat.");
    const skillsDir = join(workDir, "skills");
    mkdirSync(skillsDir);
    writeFileSync(join(skillsDir, "test.md"), "# Test skill");

    const prompt = assembleSystemPrompt(workDir, "Budget line here");

    const soulIdx = prompt.indexOf("I am a cat.");
    const skillIdx = prompt.indexOf("skills/test.md");
    const budgetIdx = prompt.indexOf("Budget line here");

    ok(soulIdx < skillIdx, "SOUL before skills");
    ok(skillIdx < budgetIdx, "skills before budget");
  });

  it("tells agent to read skills on demand", () => {
    const skillsDir = join(workDir, "skills");
    mkdirSync(skillsDir);
    writeFileSync(join(skillsDir, "deploy.md"), "# Deploy\nSteps...");

    const prompt = assembleSystemPrompt(workDir);
    ok(prompt.includes("read") || prompt.includes("Read"));
  });

  it("includes agent index when agents/ directory has profiles", () => {
    const agentsDir = join(workDir, "agents");
    mkdirSync(agentsDir);
    writeFileSync(
      join(agentsDir, "js-engineer.md"),
      "# JavaScript Engineer\n\nYou build reliable, lean JS/TS code with TDD.",
    );

    const prompt = assembleSystemPrompt(workDir);
    ok(prompt.includes("## Agents"));
    ok(prompt.includes("agents/js-engineer.md"));
    ok(prompt.includes("JavaScript Engineer"));
    ok(prompt.includes("1 specialist"));
  });

  it("shows agent summary in the index", () => {
    const agentsDir = join(workDir, "agents");
    mkdirSync(agentsDir);
    writeFileSync(
      join(agentsDir, "researcher.md"),
      "# Deep Researcher\n\nPerforms thorough web research and synthesizes findings.",
    );

    const prompt = assembleSystemPrompt(workDir);
    ok(prompt.includes("Deep Researcher"));
    ok(prompt.includes("Performs thorough web research"));
  });

  it("omits agent index when no agents/ directory exists", () => {
    const prompt = assembleSystemPrompt(workDir);
    ok(!prompt.includes("## Agents"));
  });

  it("omits agent index when agents/ directory is empty", () => {
    mkdirSync(join(workDir, "agents"));
    const prompt = assembleSystemPrompt(workDir);
    ok(!prompt.includes("## Agents"));
  });

  it("places agent index between memory and skills", () => {
    const agentsDir = join(workDir, "agents");
    const skillsDir = join(workDir, "skills");
    mkdirSync(agentsDir);
    mkdirSync(skillsDir);
    writeFileSync(join(agentsDir, "coder.md"), "# Coder\nWrites code.");
    writeFileSync(join(skillsDir, "deploy.md"), "# Deploy\nSteps...");

    const prompt = assembleSystemPrompt(workDir);
    const memoryIdx = prompt.indexOf("## Memory");
    const agentsIdx = prompt.indexOf("## Agents");
    const skillsIdx = prompt.indexOf("## Skills");

    ok(memoryIdx < agentsIdx, "Memory before Agents");
    ok(agentsIdx < skillsIdx, "Agents before Skills");
  });

  it("lists multiple agents sorted alphabetically", () => {
    const agentsDir = join(workDir, "agents");
    mkdirSync(agentsDir);
    writeFileSync(join(agentsDir, "researcher.md"), "# Researcher\nResearch things.");
    writeFileSync(join(agentsDir, "coder.md"), "# Coder\nWrite code.");

    const prompt = assembleSystemPrompt(workDir);
    ok(prompt.includes("2 specialists"));
    const coderIdx = prompt.indexOf("agents/coder.md");
    const researcherIdx = prompt.indexOf("agents/researcher.md");
    ok(coderIdx < researcherIdx, "coder before researcher (alphabetical)");
  });
});
