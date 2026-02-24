import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  assembleScoutContext,
  buildScoutPrompt,
  MAX_CONTEXT_CHARS,
  MAX_TRAILS,
  parseFrictionTrails,
  type ScoutContextConfig,
  type ScoutResult,
  type ScoutTrail,
  WORKSPACE_IGNORE,
} from "./scout.js";

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "ghostpaw-scout-"));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

// ── parseFrictionTrails ──────────────────────────────────────────────────────

describe("parseFrictionTrails", () => {
  it("parses valid JSON with 3 trails", () => {
    const input = JSON.stringify({
      trails: [
        { title: "Automated Expense Reports", why: "Mentioned expenses 4 times" },
        { title: "Client Follow-up Templates", why: "3 sessions involved drafting similar emails" },
        { title: "Weekly Status Digest", why: "Checks 4 repos every Monday" },
      ],
    });
    const result = parseFrictionTrails(input);
    strictEqual(result.length, 3);
    strictEqual(result[0]!.title, "Automated Expense Reports");
    strictEqual(result[0]!.why, "Mentioned expenses 4 times");
    strictEqual(result[2]!.title, "Weekly Status Digest");
  });

  it("parses JSON embedded in surrounding prose", () => {
    const input = `Here are the friction signals I found:\n${JSON.stringify({
      trails: [{ title: "Log Analysis", why: "Parsed logs manually 3 times" }],
    })}\nThat's all I found.`;
    const result = parseFrictionTrails(input);
    strictEqual(result.length, 1);
    strictEqual(result[0]!.title, "Log Analysis");
  });

  it("returns empty array when response has no JSON / no braces", () => {
    const result = parseFrictionTrails("No structured output here at all");
    deepStrictEqual(result, []);
  });

  it("returns empty array for malformed JSON that has braces but bad syntax", () => {
    const result = parseFrictionTrails('{"trails: [broken}');
    deepStrictEqual(result, []);
  });

  it("filters trails missing title or why fields", () => {
    const input = JSON.stringify({
      trails: [
        { title: "Valid Trail", why: "Has both fields" },
        { title: "Missing why" },
        { why: "Missing title" },
        { other: "No relevant fields" },
      ],
    });
    const result = parseFrictionTrails(input);
    strictEqual(result.length, 1);
    strictEqual(result[0]!.title, "Valid Trail");
  });

  it("filters trails with empty/whitespace-only title or why", () => {
    const input = JSON.stringify({
      trails: [
        { title: "", why: "Has why but no title" },
        { title: "Has title", why: "" },
        { title: "   ", why: "Whitespace title" },
        { title: "Valid", why: "Both present and non-empty" },
      ],
    });
    const result = parseFrictionTrails(input);
    strictEqual(result.length, 1);
    strictEqual(result[0]!.title, "Valid");
  });

  it("caps output at MAX_TRAILS when LLM returns more", () => {
    const trails = Array.from({ length: 10 }, (_, i) => ({
      title: `Trail ${i + 1}`,
      why: `Reason ${i + 1}`,
    }));
    const input = JSON.stringify({ trails });
    const result = parseFrictionTrails(input);
    strictEqual(result.length, MAX_TRAILS);
    strictEqual(result[0]!.title, "Trail 1");
    strictEqual(result[MAX_TRAILS - 1]!.title, `Trail ${MAX_TRAILS}`);
  });
});

// ── assembleScoutContext ──────────────────────────────────────────────────────

describe("assembleScoutContext", () => {
  it("includes memory content summaries (capped at 50)", () => {
    const config: ScoutContextConfig = {
      workspacePath: workDir,
      memories: Array.from({ length: 60 }, (_, i) => ({ content: `Memory item ${i}` })),
      sessions: [],
    };
    const result = assembleScoutContext(config);
    ok(result.includes("## Recent Memories (50)"));
    ok(result.includes("Memory item 0"));
    ok(result.includes("Memory item 49"));
    ok(!result.includes("Memory item 50"));
  });

  it("includes skill index with filenames and titles", () => {
    mkdirSync(join(workDir, "skills"), { recursive: true });
    writeFileSync(join(workDir, "skills", "deploy.md"), "# Deploy to Production\nSteps here.");
    writeFileSync(join(workDir, "skills", "testing.md"), "# Testing Strategy\nTDD approach.");

    const config: ScoutContextConfig = {
      workspacePath: workDir,
      memories: [],
      sessions: [],
    };
    const result = assembleScoutContext(config);
    ok(result.includes("## Current Skills (2)"));
    ok(result.includes("deploy.md: Deploy to Production"));
    ok(result.includes("testing.md: Testing Strategy"));
  });

  it("includes recent session previews with first user message", () => {
    const config: ScoutContextConfig = {
      workspacePath: workDir,
      memories: [],
      sessions: [
        { key: "sess-1", firstUserMessage: "How do I deploy to AWS?" },
        { key: "sess-2", firstUserMessage: "Fix the login bug" },
      ],
    };
    const result = assembleScoutContext(config);
    ok(result.includes("## Recent Sessions (2)"));
    ok(result.includes("[sess-1] How do I deploy to AWS?"));
    ok(result.includes("[sess-2] Fix the login bug"));
  });

  it("handles fresh install gracefully — returns minimal valid context", () => {
    const config: ScoutContextConfig = {
      workspacePath: workDir,
      memories: [],
      sessions: [],
    };
    const result = assembleScoutContext(config);
    ok(result.length > 0, "context should not be empty");
    ok(result.includes("No memories yet"));
    ok(result.includes("No skills yet"));
    ok(result.includes("No sessions yet"));
  });

  it("caps total context length to MAX_CONTEXT_CHARS", () => {
    const config: ScoutContextConfig = {
      workspacePath: workDir,
      memories: Array.from({ length: 50 }, (_, i) => ({
        content: `Memory ${i}: ${"x".repeat(1000)}`,
      })),
      sessions: [],
    };
    const result = assembleScoutContext(config);
    ok(result.length <= MAX_CONTEXT_CHARS + 30); // +30 for the truncation marker
    ok(result.includes("[context truncated]"));
  });

  it("excludes sessions with no firstUserMessage content", () => {
    const config: ScoutContextConfig = {
      workspacePath: workDir,
      memories: [],
      sessions: [
        { key: "sess-1", firstUserMessage: "Real message" },
        { key: "sess-2", firstUserMessage: "" },
        { key: "sess-3" },
      ],
    };
    const result = assembleScoutContext(config);
    ok(result.includes("[sess-1] Real message"));
    ok(!result.includes("[sess-2]"));
    ok(!result.includes("[sess-3]"));
  });
});

// ── assembleScoutContext — workspace listing ─────────────────────────────────

describe("assembleScoutContext — workspace listing", () => {
  it("includes workspace file listing", () => {
    writeFileSync(join(workDir, "package.json"), "{}");
    writeFileSync(join(workDir, "README.md"), "# Hello");
    mkdirSync(join(workDir, "src"), { recursive: true });

    const config: ScoutContextConfig = {
      workspacePath: workDir,
      memories: [],
      sessions: [],
    };
    const result = assembleScoutContext(config);
    ok(result.includes("## Workspace Structure"));
    ok(result.includes("package.json"));
    ok(result.includes("README.md"));
    ok(result.includes("src"));
  });

  it("excludes .ghostpaw, node_modules, ghostpaw.db from workspace listing", () => {
    mkdirSync(join(workDir, ".ghostpaw"), { recursive: true });
    mkdirSync(join(workDir, "node_modules"), { recursive: true });
    mkdirSync(join(workDir, ".git"), { recursive: true });
    writeFileSync(join(workDir, "ghostpaw.db"), "");
    writeFileSync(join(workDir, "ghostpaw.db-wal"), "");
    writeFileSync(join(workDir, "ghostpaw.db-shm"), "");
    writeFileSync(join(workDir, "SOUL.md"), "# Soul");

    const config: ScoutContextConfig = {
      workspacePath: workDir,
      memories: [],
      sessions: [],
    };
    const result = assembleScoutContext(config);
    ok(result.includes("SOUL.md"));
    for (const ignored of WORKSPACE_IGNORE) {
      ok(!result.includes(`## Workspace Structure\n\n${ignored}`));
      const wsSection = result.split("## Workspace Structure")[1];
      if (wsSection) {
        const entries = wsSection.split("\n\n")[1] ?? "";
        const names = entries.split(", ");
        ok(!names.includes(ignored), `should not contain ${ignored}`);
      }
    }
  });

  it("handles empty workspace (no extra section)", () => {
    const emptyDir = mkdtempSync(join(tmpdir(), "ghostpaw-empty-"));
    try {
      const config: ScoutContextConfig = {
        workspacePath: emptyDir,
        memories: [],
        sessions: [],
      };
      const result = assembleScoutContext(config);
      ok(!result.includes("## Workspace Structure"));
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});

// ── buildScoutPrompt ─────────────────────────────────────────────────────────

describe("buildScoutPrompt", () => {
  it("is exported and returns non-empty string", () => {
    strictEqual(typeof buildScoutPrompt, "function");
    const result = buildScoutPrompt(workDir, "meal planning");
    ok(result.length > 0);
    ok(result.includes("meal planning"));
  });

  it("uses skill-scout.md when present", () => {
    mkdirSync(join(workDir, "skills"), { recursive: true });
    writeFileSync(
      join(workDir, "skills", "skill-scout.md"),
      "# Skill Scout\n\nCustom scout playbook with detailed instructions for the agent.",
    );
    const result = buildScoutPrompt(workDir, "expense tracking");
    ok(result.includes("Custom scout playbook"));
    ok(result.includes("expense tracking"));
  });

  it("falls back when skill-scout.md missing", () => {
    const result = buildScoutPrompt(workDir, "deploy automation");
    ok(result.includes("deploy automation"));
    ok(result.includes("scouting a new direction"));
  });
});

// ── Module exports / types ───────────────────────────────────────────────────

describe("scout module exports", () => {
  it("exports required functions", async () => {
    const mod = await import("./scout.js");
    strictEqual(typeof mod.parseFrictionTrails, "function");
    strictEqual(typeof mod.assembleScoutContext, "function");
    strictEqual(typeof mod.buildScoutPrompt, "function");
    strictEqual(typeof mod.scout, "function");
    strictEqual(typeof mod.runScout, "function");
  });

  it("ScoutTrail shape has title and why as strings", () => {
    const trail: ScoutTrail = { title: "Test", why: "Because" };
    strictEqual(typeof trail.title, "string");
    strictEqual(typeof trail.why, "string");
  });

  it("ScoutResult shape has trails array and mode field", () => {
    const suggest: ScoutResult = { mode: "suggest", trails: [{ title: "A", why: "B" }] };
    strictEqual(suggest.mode, "suggest");
    ok(Array.isArray(suggest.trails));

    const report: ScoutResult = { mode: "report", direction: "meal planning", report: "..." };
    strictEqual(report.mode, "report");
    strictEqual(report.direction, "meal planning");
    strictEqual(typeof report.report, "string");
  });
});
