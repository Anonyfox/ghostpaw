import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getAgentProfile, getAgentSummary, listAgentProfiles } from "./agents.js";

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "ghostpaw-agents-"));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("listAgentProfiles", () => {
  it("returns empty array when no agents/ directory exists", () => {
    const profiles = listAgentProfiles(workDir);
    deepStrictEqual(profiles, []);
  });

  it("returns empty array when agents/ is empty", () => {
    mkdirSync(join(workDir, "agents"));
    const profiles = listAgentProfiles(workDir);
    deepStrictEqual(profiles, []);
  });

  it("lists .md files as agent names, sorted alphabetically", () => {
    mkdirSync(join(workDir, "agents"));
    writeFileSync(join(workDir, "agents", "researcher.md"), "You are a researcher.");
    writeFileSync(join(workDir, "agents", "coder.md"), "You are a coder.");
    writeFileSync(join(workDir, "agents", "reviewer.md"), "You are a reviewer.");

    const profiles = listAgentProfiles(workDir);
    deepStrictEqual(profiles, ["coder", "researcher", "reviewer"]);
  });

  it("ignores empty .md files", () => {
    mkdirSync(join(workDir, "agents"));
    writeFileSync(join(workDir, "agents", "good.md"), "Content here.");
    writeFileSync(join(workDir, "agents", "empty.md"), "");
    writeFileSync(join(workDir, "agents", "whitespace.md"), "   \n  ");

    const profiles = listAgentProfiles(workDir);
    deepStrictEqual(profiles, ["good"]);
  });

  it("ignores non-.md files", () => {
    mkdirSync(join(workDir, "agents"));
    writeFileSync(join(workDir, "agents", "agent.md"), "Valid agent.");
    writeFileSync(join(workDir, "agents", "notes.txt"), "Not an agent.");
    writeFileSync(join(workDir, "agents", "config.json"), "{}");

    const profiles = listAgentProfiles(workDir);
    deepStrictEqual(profiles, ["agent"]);
  });
});

describe("getAgentProfile", () => {
  it("returns null when agents/ directory does not exist", () => {
    strictEqual(getAgentProfile(workDir, "researcher"), null);
  });

  it("returns null for non-existent agent", () => {
    mkdirSync(join(workDir, "agents"));
    strictEqual(getAgentProfile(workDir, "nonexistent"), null);
  });

  it("returns null for empty agent file", () => {
    mkdirSync(join(workDir, "agents"));
    writeFileSync(join(workDir, "agents", "empty.md"), "  \n ");
    strictEqual(getAgentProfile(workDir, "empty"), null);
  });

  it("loads agent profile from .md file", () => {
    mkdirSync(join(workDir, "agents"));
    writeFileSync(join(workDir, "agents", "researcher.md"), "# Researcher\n\nYou are thorough.");

    const profile = getAgentProfile(workDir, "researcher");
    ok(profile);
    strictEqual(profile.name, "researcher");
    strictEqual(profile.systemPrompt, "# Researcher\n\nYou are thorough.");
  });

  it("trims whitespace from profile content", () => {
    mkdirSync(join(workDir, "agents"));
    writeFileSync(join(workDir, "agents", "coder.md"), "\n  You write code.  \n\n");

    const profile = getAgentProfile(workDir, "coder");
    ok(profile);
    strictEqual(profile.systemPrompt, "You write code.");
  });

  it("rejects path traversal in agent names", () => {
    mkdirSync(join(workDir, "agents"));
    strictEqual(getAgentProfile(workDir, "../etc/passwd"), null);
    strictEqual(getAgentProfile(workDir, "foo/bar"), null);
    strictEqual(getAgentProfile(workDir, ""), null);
  });
});

describe("getAgentSummary", () => {
  it("returns null when agents/ directory does not exist", () => {
    strictEqual(getAgentSummary(workDir, "researcher"), null);
  });

  it("returns null for non-existent agent", () => {
    mkdirSync(join(workDir, "agents"));
    strictEqual(getAgentSummary(workDir, "nonexistent"), null);
  });

  it("returns null for empty agent file", () => {
    mkdirSync(join(workDir, "agents"));
    writeFileSync(join(workDir, "agents", "empty.md"), "  \n ");
    strictEqual(getAgentSummary(workDir, "empty"), null);
  });

  it("extracts title from first heading", () => {
    mkdirSync(join(workDir, "agents"));
    writeFileSync(
      join(workDir, "agents", "coder.md"),
      "# JavaScript Engineer\n\nYou write clean code.",
    );
    const summary = getAgentSummary(workDir, "coder");
    ok(summary);
    strictEqual(summary.name, "coder");
    strictEqual(summary.title, "JavaScript Engineer");
  });

  it("extracts first paragraph as summary", () => {
    mkdirSync(join(workDir, "agents"));
    writeFileSync(
      join(workDir, "agents", "coder.md"),
      "# Coder\n\nYou build reliable, lean JS/TS code.\n\n## More details\nOther stuff.",
    );
    const summary = getAgentSummary(workDir, "coder");
    ok(summary);
    strictEqual(summary.summary, "You build reliable, lean JS/TS code.");
  });

  it("strips markdown bold from summary", () => {
    mkdirSync(join(workDir, "agents"));
    writeFileSync(join(workDir, "agents", "coder.md"), "# Coder\n\n**You** build code.");
    const summary = getAgentSummary(workDir, "coder");
    ok(summary);
    strictEqual(summary.summary, "You build code.");
  });

  it("truncates long summaries to 120 chars", () => {
    mkdirSync(join(workDir, "agents"));
    const longLine = "A".repeat(200);
    writeFileSync(join(workDir, "agents", "coder.md"), `# Coder\n\n${longLine}`);
    const summary = getAgentSummary(workDir, "coder");
    ok(summary);
    strictEqual(summary.summary.length, 120);
  });

  it("returns (untitled) when no heading exists", () => {
    mkdirSync(join(workDir, "agents"));
    writeFileSync(join(workDir, "agents", "coder.md"), "Just some content without a heading.");
    const summary = getAgentSummary(workDir, "coder");
    ok(summary);
    strictEqual(summary.title, "(untitled)");
  });

  it("returns empty summary when only a heading exists", () => {
    mkdirSync(join(workDir, "agents"));
    writeFileSync(join(workDir, "agents", "coder.md"), "# Coder");
    const summary = getAgentSummary(workDir, "coder");
    ok(summary);
    strictEqual(summary.title, "Coder");
    strictEqual(summary.summary, "");
  });

  it("rejects path traversal in agent names", () => {
    mkdirSync(join(workDir, "agents"));
    strictEqual(getAgentSummary(workDir, "../etc/passwd"), null);
    strictEqual(getAgentSummary(workDir, ""), null);
  });
});
