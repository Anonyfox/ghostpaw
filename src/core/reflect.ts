/**
 * Training engine — the systematic retrospective that turns accumulated
 * experience into sharper skills. Three phases:
 *
 * 1. Absorb  — extract learnings from unprocessed sessions
 * 2. Train   — recall memories, review skills, identify gaps, act
 * 3. Tidy    — vacuum old absorbed sessions, optimize DB
 *
 * Loads the training playbook from skills/skill-training.md when available,
 * falls back to a minimal built-in prompt otherwise.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  commitSkills,
  getSkillRank,
  diffSkills as gitDiffSkills,
  hasHistory,
  initHistory,
} from "../lib/skill-history.js";
import { commitSouls, hasSoulHistory, initSoulHistory } from "../lib/soul-history.js";
import { banner, blank, label, log, startProgress, style } from "../lib/terminal.js";

declare const __VERSION__: string;
let VERSION: string;
try {
  VERSION = __VERSION__;
} catch {
  VERSION = "dev";
}

const DEFAULT_TIDY_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const FALLBACK_PROMPT = `Time to train. Review what you've learned recently and improve your skills.

1. Use the memory tool to recall recent experience (tasks, mistakes, corrections, preferences).
2. Use the skills tool with action "list" to see your current skills and ranks.
3. Use the skills tool with action "diff" to check uncommitted changes since last training.
4. Compare experience to skills — identify gaps, stale procedures, missing edge cases. Look for memories that describe corrections, preferences, or procedures that no skill captures yet.
5. Create new skills or improve existing ones. Only from real experience, never speculation. Keep each skill under 80 lines — split if needed.
6. Clean up any rough drafts or cruft in skill files.
7. Summarize what you changed and why. For each changed skill, write a one-line description of what changed and why.

Skills are a performance cache. Encode concrete details (names, values, paths, preferences) directly in skills so they're available without a memory recall round-trip. If memory has newer data than a skill, update the skill to match.

Be conservative. A skill born from real experience is valuable. A skill born from imagination is noise.`;

function loadTrainingPrompt(workspace: string): string {
  const skillPath = join(workspace, "skills", "skill-training.md");
  try {
    if (existsSync(skillPath)) {
      const content = readFileSync(skillPath, "utf-8").trim();
      if (content.length > 50) {
        return `Follow the training playbook below. This is your systematic process for turning experience into skills.\n\n${content}`;
      }
    }
  } catch {
    // fall through
  }
  return FALLBACK_PROMPT;
}

// ── Snapshot / diff helpers (in-memory fallback when git unavailable) ────────

interface SkillSnapshot {
  [filename: string]: string;
}

export interface TrainChange {
  type: "created" | "updated";
  filename: string;
  title: string;
  rank: number;
  description: string;
}

function snapshotSkills(workspacePath: string): SkillSnapshot {
  const skillsDir = join(workspacePath, "skills");
  if (!existsSync(skillsDir)) return {};

  const snapshot: SkillSnapshot = {};
  try {
    for (const file of readdirSync(skillsDir)) {
      if (!file.endsWith(".md")) continue;
      snapshot[file] = readFileSync(join(skillsDir, file), "utf-8");
    }
  } catch {
    // empty or unreadable
  }
  return snapshot;
}

function extractTitle(content: string): string {
  const firstLine = content.split("\n").find((l) => l.trim().startsWith("#"));
  if (firstLine) return firstLine.replace(/^#+\s*/, "").trim();
  return "(untitled)";
}

function extractDescription(content: string): string {
  const lines = content.split("\n");
  let pastTitle = false;
  const para: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!pastTitle) {
      if (trimmed.startsWith("#")) {
        pastTitle = true;
      }
      continue;
    }
    if (!trimmed && para.length > 0) break;
    if (
      trimmed &&
      !trimmed.startsWith("#") &&
      !trimmed.startsWith("```") &&
      !trimmed.startsWith("---")
    ) {
      para.push(trimmed);
    } else if (para.length > 0) {
      break;
    }
  }
  const desc = para.join(" ");
  if (desc.length > 160) return `${desc.slice(0, 157)}...`;
  return desc || "";
}

function diffSkills(before: SkillSnapshot, after: SkillSnapshot): Omit<TrainChange, "rank">[] {
  const changes: Omit<TrainChange, "rank">[] = [];

  for (const [filename, content] of Object.entries(after)) {
    if (!(filename in before)) {
      changes.push({
        type: "created",
        filename,
        title: extractTitle(content),
        description: extractDescription(content),
      });
    } else if (before[filename] !== content) {
      changes.push({
        type: "updated",
        filename,
        title: extractTitle(content),
        description: extractDescription(content),
      });
    }
  }

  return changes;
}

// ── Training session orchestration ──────────────────────────────────────────

export interface TrainResult {
  changes: TrainChange[];
  agentResponse: string;
  absorbed: number;
  memoriesCreated: number;
  tidied: number;
  totalSkills: number;
  skippedAbsorb: number;
}

function ensureBaselineCommit(workspace: string): boolean {
  if (!hasHistory(workspace)) initHistory(workspace);
  if (!hasHistory(workspace)) return false;
  commitSkills(workspace, "pre-training baseline");
  return true;
}

function safeRead(path: string): string {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

function detectChanges(
  workspace: string,
  useGit: boolean,
  memBefore: SkillSnapshot,
): TrainChange[] {
  let raw: Omit<TrainChange, "rank">[];

  if (useGit) {
    const gd = gitDiffSkills(workspace);
    if (gd) {
      raw = [];
      const skillsDir = join(workspace, "skills");
      for (const f of gd.created) {
        const content = safeRead(join(skillsDir, f));
        raw.push({
          type: "created",
          filename: f,
          title: extractTitle(content),
          description: extractDescription(content),
        });
      }
      for (const f of gd.updated) {
        const content = safeRead(join(skillsDir, f));
        raw.push({
          type: "updated",
          filename: f,
          title: extractTitle(content),
          description: extractDescription(content),
        });
      }
    } else {
      raw = diffSkills(memBefore, snapshotSkills(workspace));
    }
  } else {
    raw = diffSkills(memBefore, snapshotSkills(workspace));
  }

  return raw.map((c) => ({
    ...c,
    rank: useGit ? getSkillRank(workspace, c.filename) + 1 : 0,
  }));
}

// ── Phase 1: Absorb ─────────────────────────────────────────────────────────

async function runAbsorb(
  workspace: string,
): Promise<{ absorbed: number; memoriesCreated: number; skipped: number }> {
  const { createDatabase } = await import("./database.js");
  const { createSessionStore } = await import("./session.js");
  const { createMemoryStore } = await import("./memory.js");
  const { createEmbeddingProvider } = await import("../lib/embedding.js");
  const { loadConfig } = await import("./config.js");
  const { absorbSessions } = await import("./absorb.js");
  const { createSecretStore } = await import("./secrets.js");

  const dbPath = resolve(workspace, "ghostpaw.db");
  const db = await createDatabase(dbPath);

  try {
    const secrets = createSecretStore(db);
    secrets.loadIntoEnv();
    secrets.syncProviderKeys();

    const config = await loadConfig(workspace);
    const sessions = createSessionStore(db);
    const memory = createMemoryStore(db);
    const embedding = createEmbeddingProvider();

    const result = await absorbSessions({
      db,
      sessions,
      memory,
      embedding,
      model: config.models.default,
    });

    return {
      absorbed: result.absorbed,
      memoriesCreated: result.memoriesCreated,
      skipped: result.skipped,
    };
  } finally {
    db.close();
  }
}

// ── Phase 3: Tidy ───────────────────────────────────────────────────────────

async function runTidy(workspace: string): Promise<number> {
  const { createDatabase } = await import("./database.js");
  const { createSessionStore } = await import("./session.js");

  const dbPath = resolve(workspace, "ghostpaw.db");
  const db = await createDatabase(dbPath);

  try {
    const sessions = createSessionStore(db);
    const deleted = sessions.deleteOldAbsorbed(DEFAULT_TIDY_TTL_MS);
    db.sqlite.exec("PRAGMA optimize");
    return deleted;
  } finally {
    db.close();
  }
}

// ── Full pipeline ───────────────────────────────────────────────────────────

export async function runTrain(
  workspace: string,
  onPhase?: (phase: string) => void,
): Promise<TrainResult> {
  // Phase 1: Absorb
  onPhase?.("absorb");
  const absorbResult = await runAbsorb(workspace);

  // Phase 2: Train
  onPhase?.("train");
  const { createAgent } = await import("../index.js");
  const prompt = loadTrainingPrompt(workspace);

  const useGit = ensureBaselineCommit(workspace);
  const memBefore = snapshotSkills(workspace);
  const totalSkills = Object.keys(snapshotSkills(workspace)).length;

  const agent = await createAgent({
    workspace,
    excludeTools: ["train", "scout"],
    purpose: "train",
  });
  const response = await agent.run(prompt);

  const changes = detectChanges(workspace, useGit, memBefore);

  if (useGit && changes.length > 0) {
    const msg = changes.map((c) => `${c.type}: ${c.filename}`).join(", ");
    commitSkills(workspace, `train: ${msg}`);
  }

  if (!hasSoulHistory(workspace)) initSoulHistory(workspace);
  commitSouls(workspace, "train: post-training soul snapshot");

  // Phase 3: Tidy
  onPhase?.("tidy");
  const tidied = await runTidy(workspace);

  return {
    changes,
    agentResponse: response,
    absorbed: absorbResult.absorbed + absorbResult.skipped,
    memoriesCreated: absorbResult.memoriesCreated,
    skippedAbsorb: absorbResult.skipped,
    tidied,
    totalSkills,
  };
}

// ── Report ──────────────────────────────────────────────────────────────────

function sectionHeader(title: string): void {
  const line = "\u2500".repeat(48 - title.length);
  console.log(`  ${style.dim("\u2500\u2500")} ${style.bold(title)} ${style.dim(line)}`);
}

function allSkillTitles(workspace: string): Map<string, string> {
  const skillsDir = join(workspace, "skills");
  const map = new Map<string, string>();
  if (!existsSync(skillsDir)) return map;
  try {
    for (const file of readdirSync(skillsDir)) {
      if (!file.endsWith(".md")) continue;
      const content = safeRead(join(skillsDir, file));
      map.set(file, extractTitle(content));
    }
  } catch {
    // empty
  }
  return map;
}

export function printTrainReport(result: TrainResult, workspace?: string): void {
  blank();

  if (result.changes.length > 0) {
    sectionHeader("Level Up");
    blank();

    for (const change of result.changes) {
      if (change.type === "created") {
        label(
          "learned",
          `${style.bold(change.title)} ${style.dim(`(${change.filename})`)}`,
          style.boldGreen,
        );
      } else {
        const rankStr = change.rank > 0 ? `rank ${change.rank}` : "ranked up";
        label(
          rankStr,
          `${style.bold(change.title)} ${style.dim(`(${change.filename})`)}`,
          style.boldCyan,
        );
      }
    }
    blank();
  }

  // Show unchanged skills
  const changedFiles = new Set(result.changes.map((c) => c.filename));
  const allSkills = workspace ? allSkillTitles(workspace) : new Map<string, string>();
  const unchanged = [...allSkills.entries()].filter(([f]) => !changedFiles.has(f));

  if (unchanged.length > 0) {
    sectionHeader("Unchanged");
    blank();
    for (const [, title] of unchanged) {
      label("", style.dim(`${title} \u2014 no new patterns`), style.dim);
    }
    blank();
  }

  // Summary
  sectionHeader("Summary");
  blank();

  if (result.absorbed > 0) {
    label(
      "absorbed",
      `${result.absorbed} session${result.absorbed === 1 ? "" : "s"} \u2192 ${result.memoriesCreated} memor${result.memoriesCreated === 1 ? "y" : "ies"} extracted`,
      style.dim,
    );
  }

  if (result.changes.length > 0) {
    const created = result.changes.filter((c) => c.type === "created").length;
    const updated = result.changes.filter((c) => c.type === "updated").length;
    const parts: string[] = [];
    if (created > 0) parts.push(`${created} learned`);
    if (updated > 0) parts.push(`${updated} ranked up`);
    log.done(parts.join(", "));
  } else {
    log.info("no skill changes \u2014 keep using me, try /scout for ideas");
  }

  if (result.tidied > 0) {
    label(
      "tidied",
      `${result.tidied} old session${result.tidied === 1 ? "" : "s"} cleaned up`,
      style.dim,
    );
  }

  blank();
}

// ── Entry point ─────────────────────────────────────────────────────────────

export async function train(workspace: string): Promise<void> {
  blank();
  banner("ghostpaw", VERSION);
  label("training", "reviewing experience, sharpening skills", style.boldCyan);
  blank();

  let stopProgress = startProgress("absorbing sessions");
  const result = await runTrain(workspace, (phase) => {
    stopProgress();
    if (phase === "train") {
      stopProgress = startProgress("analyzing skills against experience");
    } else if (phase === "tidy") {
      stopProgress = startProgress("tidying up");
    }
  });
  stopProgress();

  printTrainReport(result, workspace);
}
