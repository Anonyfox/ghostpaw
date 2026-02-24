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
import { banner, blank, label, log, style } from "../lib/terminal.js";

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
4. Compare experience to skills — identify gaps, stale procedures, missing edge cases.
5. Create new skills or improve existing ones. Only from real experience, never speculation.
6. Clean up any rough drafts or cruft in skill files.
7. Summarize what you changed and why.

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

function diffSkills(before: SkillSnapshot, after: SkillSnapshot): Omit<TrainChange, "rank">[] {
  const changes: Omit<TrainChange, "rank">[] = [];

  for (const [filename, content] of Object.entries(after)) {
    if (!(filename in before)) {
      changes.push({ type: "created", filename, title: extractTitle(content) });
    } else if (before[filename] !== content) {
      changes.push({ type: "updated", filename, title: extractTitle(content) });
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
        raw.push({ type: "created", filename: f, title: extractTitle(content) });
      }
      for (const f of gd.updated) {
        const content = safeRead(join(skillsDir, f));
        raw.push({ type: "updated", filename: f, title: extractTitle(content) });
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
): Promise<{ absorbed: number; memoriesCreated: number }> {
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

    return { absorbed: result.absorbed, memoriesCreated: result.memoriesCreated };
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

/**
 * Mark the most recent unabsorbed session as absorbed. Called after a training
 * agent run to prevent the training conversation itself from being absorbed
 * in the next training cycle (avoids self-referential feedback loops).
 */
async function markTrainingSession(workspace: string): Promise<void> {
  const { createDatabase } = await import("./database.js");
  const { createSessionStore } = await import("./session.js");

  const dbPath = resolve(workspace, "ghostpaw.db");
  const db = await createDatabase(dbPath);
  try {
    const sessions = createSessionStore(db);
    const unabsorbed = sessions.listUnabsorbed();
    if (unabsorbed.length > 0) {
      const newest = unabsorbed[unabsorbed.length - 1];
      sessions.markAbsorbed(newest.id);
    }
  } finally {
    db.close();
  }
}

// ── Full pipeline ───────────────────────────────────────────────────────────

export async function runTrain(workspace: string): Promise<TrainResult> {
  // Phase 1: Absorb
  const absorbResult = await runAbsorb(workspace);

  // Phase 2: Train
  const { createAgent } = await import("../index.js");
  const prompt = loadTrainingPrompt(workspace);

  const useGit = ensureBaselineCommit(workspace);
  const memBefore = snapshotSkills(workspace);

  const agent = await createAgent({ workspace });
  const response = await agent.run(prompt);

  // Mark the training agent's own session as absorbed so it won't be
  // re-processed in the next training run (prevents feedback loops).
  markTrainingSession(workspace);

  const changes = detectChanges(workspace, useGit, memBefore);

  if (useGit && changes.length > 0) {
    const msg = changes.map((c) => `${c.type}: ${c.filename}`).join(", ");
    commitSkills(workspace, `train: ${msg}`);
  }

  // Phase 3: Tidy
  const tidied = await runTidy(workspace);

  return {
    changes,
    agentResponse: response,
    absorbed: absorbResult.absorbed,
    memoriesCreated: absorbResult.memoriesCreated,
    tidied,
  };
}

// ── Report ──────────────────────────────────────────────────────────────────

export function printTrainReport(result: TrainResult): void {
  blank();

  if (result.absorbed > 0 || result.memoriesCreated > 0) {
    label(
      "absorbed",
      `${result.absorbed} session${result.absorbed === 1 ? "" : "s"} → ${result.memoriesCreated} memor${result.memoriesCreated === 1 ? "y" : "ies"} extracted`,
      style.dim,
    );
  }

  if (result.changes.length === 0) {
    blank();
    log.info("No skill changes — keep using me and I'll have more to learn from");
    log.info("Try /scout to discover new skill possibilities");
    blank();
    return;
  }

  blank();
  for (const change of result.changes) {
    if (change.type === "created") {
      label(
        "learned",
        `${style.bold(change.title)} ${style.dim(`(${change.filename})`)}`,
        style.boldGreen,
      );
    } else {
      const rankStr = change.rank > 0 ? `rank ${change.rank}` : "leveled up";
      label(
        rankStr,
        `${style.bold(change.title)} ${style.dim(`(${change.filename})`)}`,
        style.boldCyan,
      );
    }
  }

  blank();
  const created = result.changes.filter((c) => c.type === "created").length;
  const updated = result.changes.filter((c) => c.type === "updated").length;
  const parts: string[] = [];
  if (created > 0) parts.push(`${created} learned`);
  if (updated > 0) parts.push(`${updated} ranked up`);
  log.done(
    `${parts.join(", ")} — ${result.changes.length} skill${result.changes.length === 1 ? "" : "s"} total`,
  );

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

export async function train(workspace: string, opts: { stream?: boolean } = {}): Promise<void> {
  blank();
  banner("ghostpaw", VERSION);
  log.info("Training — reviewing experience, sharpening skills...");
  blank();

  if (opts.stream) {
    // Phase 1: Absorb
    const absorbResult = await runAbsorb(workspace);
    if (absorbResult.absorbed > 0) {
      label(
        "absorbed",
        `${absorbResult.absorbed} session${absorbResult.absorbed === 1 ? "" : "s"} → ${absorbResult.memoriesCreated} memor${absorbResult.memoriesCreated === 1 ? "y" : "ies"} extracted`,
        style.dim,
      );
      blank();
    }

    // Phase 2: Train (streaming)
    const { createAgent } = await import("../index.js");
    const prompt = loadTrainingPrompt(workspace);

    const useGit = ensureBaselineCommit(workspace);
    const memBefore = snapshotSkills(workspace);

    const agent = await createAgent({ workspace });
    process.stdout.write(style.dim("ghostpaw "));
    let response = "";
    for await (const chunk of agent.stream(prompt)) {
      process.stdout.write(chunk);
      response += chunk;
    }
    process.stdout.write("\n");

    markTrainingSession(workspace);

    const changes = detectChanges(workspace, useGit, memBefore);

    if (useGit && changes.length > 0) {
      const msg = changes.map((c) => `${c.type}: ${c.filename}`).join(", ");
      commitSkills(workspace, `train: ${msg}`);
    }

    // Phase 3: Tidy
    const tidied = await runTidy(workspace);

    // Absorption already printed above — pass 0 to avoid double-printing
    printTrainReport({
      changes,
      agentResponse: response,
      absorbed: 0,
      memoriesCreated: 0,
      tidied,
    });
  } else {
    const result = await runTrain(workspace);
    printTrainReport(result);
  }
}
