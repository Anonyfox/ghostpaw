/**
 * Soul refinement — two-phase process modeled after the scout pattern.
 *
 * Phase 1 (discover): Analyze a soul's content and performance evidence,
 *   produce 2-4 specific improvement suggestions ("trails").
 * Phase 2 (apply): Given a chosen direction + optional user notes, make a
 *   focused, moderate revision and commit to soul-history.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  commitSouls,
  getLastCommitDiff,
  getSoulLevel,
  hasSoulHistory,
  initSoulHistory,
} from "../lib/soul-history.js";
import type { GhostpawDatabase } from "./database.js";
import type { RunStore } from "./runs.js";
import type { SessionStore } from "./session.js";

export interface SoulTrail {
  title: string;
  why: string;
}

export interface ApplyRefinementResult {
  revised: boolean;
  level: number;
  summary: string;
  changelog: string;
}

interface RunEvidence {
  prompt: string;
  result: string | null;
  status: string;
}

// ── Evidence gathering (shared by both phases) ──────────────────────────────

interface RefineDbContext {
  db: GhostpawDatabase;
  sessions: SessionStore;
  runStore: RunStore;
  systemSessionId: string;
  model: string;
}

async function openRefineDb(workspace: string): Promise<RefineDbContext> {
  const { createDatabase } = await import("./database.js");
  const { createSessionStore, getOrCreateSystemSession } = await import("./session.js");
  const { createRunStore } = await import("./runs.js");
  const { createSecretStore } = await import("./secrets.js");
  const { loadConfig } = await import("./config.js");

  const db = await createDatabase(resolve(workspace, "ghostpaw.db"));
  const secrets = createSecretStore(db);
  secrets.loadIntoEnv();
  secrets.syncProviderKeys();

  const sessions = createSessionStore(db);
  const runStore = createRunStore(db);
  const systemSessionId = getOrCreateSystemSession(sessions);
  const config = await loadConfig(workspace);

  return { db, sessions, runStore, systemSessionId, model: config.models.default };
}

async function gatherEvidence(
  workspace: string,
  filename: string,
  ctx?: RefineDbContext,
): Promise<string> {
  const { createDatabase } = await import("./database.js");
  const { createMemoryStore } = await import("./memory.js");
  const { createEmbeddingProvider } = await import("../lib/embedding.js");
  const { createSecretStore } = await import("./secrets.js");

  const db = ctx?.db ?? (await createDatabase(resolve(workspace, "ghostpaw.db")));
  const ownsDb = !ctx;

  try {
    if (!ctx) {
      const secrets = createSecretStore(db);
      secrets.loadIntoEnv();
      secrets.syncProviderKeys();
    }

    const memory = createMemoryStore(db);
    const embedding = createEmbeddingProvider();

    const agentName = filename.replace(/\.md$/, "");
    const soulContent = readFileSync(resolve(workspace, "agents", filename), "utf-8");
    const titleMatch = soulContent.match(/^#\s+(.+)/m);
    const soulTitle = titleMatch ? titleMatch[1] : agentName;

    const queryVec = await embedding.embed(
      `${soulTitle} ${agentName} delegation feedback performance issues`,
    );
    const memories = memory.search(queryVec, { k: 15, minScore: 0.05, includeGlobal: true });

    const runs = db.sqlite
      .prepare(
        `SELECT prompt, result, status FROM runs
         WHERE agent_profile = ? AND status IN ('completed', 'failed')
         ORDER BY completed_at DESC LIMIT 15`,
      )
      .all(agentName) as unknown as RunEvidence[];

    const parts: string[] = [];

    if (memories.length > 0) {
      parts.push("### Relevant Memories\n");
      for (const m of memories) {
        parts.push(`- ${m.content}`);
      }
    }

    if (runs.length > 0) {
      parts.push("\n### Recent Delegation Runs\n");
      for (const r of runs) {
        const status = r.status === "completed" ? "completed" : "FAILED";
        const prompt = (r.prompt ?? "").slice(0, 200);
        const result = r.result ? r.result.slice(0, 300) : "(no result)";
        parts.push(`**[${status}]** Task: ${prompt}`);
        parts.push(`Result excerpt: ${result}\n`);
      }
    }

    if (parts.length === 0) {
      parts.push(
        "No delegation runs or relevant memories found yet. " +
          "Assess the soul based on its internal clarity, completeness, " +
          "and consistency. Look for vague areas that could be tightened.",
      );
    }

    return parts.join("\n");
  } finally {
    if (ownsDb) db.close();
  }
}

// ── Phase 1: Discover trails ────────────────────────────────────────────────

const DISCOVER_PROMPT = `You are analyzing an agent soul to identify specific, actionable improvements.

## Current Soul

\`\`\`markdown
{{SOUL_CONTENT}}
\`\`\`

## Evidence from Practice

{{EVIDENCE}}

## Your Task

Identify 2-4 specific, concrete improvements for this soul. Each suggestion should be a focused change — not a rewrite.

Good suggestions:
- "Add a constraint about X" (something the evidence shows is missing)
- "Tighten the Y section" (vague instructions that led to inconsistent behavior)
- "Encode preference for Z" (a pattern from memories/runs that should be baked in)

Bad suggestions:
- "Rewrite the entire soul" (too broad)
- "Make it better" (not actionable)
- "Add more detail everywhere" (not specific)

Respond with ONLY a JSON array of objects, each with "title" (short label, 3-8 words) and "why" (one sentence explaining the rationale based on evidence). No preamble, no wrapping.

Example format:
[{"title": "Add error handling constraints", "why": "Three recent runs failed silently without reporting errors back to the caller."}]`;

export async function discoverSoulTrails(
  workspace: string,
  filename: string,
  onPhase?: (phase: string) => void,
): Promise<SoulTrail[]> {
  const agentsDir = resolve(workspace, "agents");
  const filePath = join(agentsDir, filename);
  const soulContent = readFileSync(filePath, "utf-8");

  const ctx = await openRefineDb(workspace);
  try {
    onPhase?.("reviewing");
    const evidence = await gatherEvidence(workspace, filename, ctx);

    onPhase?.("analyzing");
    const { Chat } = await import("chatoyant");

    const prompt = DISCOVER_PROMPT.replace("{{SOUL_CONTENT}}", soulContent).replace(
      "{{EVIDENCE}}",
      evidence,
    );

    const run = ctx.runStore.create({
      sessionId: ctx.systemSessionId,
      prompt: `discover: ${filename}`,
      agentProfile: "refine",
      model: ctx.model,
    });

    const chat = new Chat({ model: ctx.model });
    let response: string;
    try {
      const result = await chat.user(prompt).generateWithResult();
      response = result.content;
      ctx.runStore.complete(run.id, response);
      ctx.runStore.recordUsage(
        run.id,
        result.model,
        result.usage.inputTokens,
        result.usage.outputTokens,
        result.cost.estimatedUsd,
      );
      ctx.sessions.updateSessionTokens(
        ctx.systemSessionId,
        result.usage.inputTokens,
        result.usage.outputTokens,
        result.cost.estimatedUsd,
      );
    } catch (err) {
      ctx.runStore.fail(run.id, err instanceof Error ? err.message : String(err));
      throw err;
    }

    const cleaned = response
      .trim()
      .replace(/^```json?\s*/i, "")
      .replace(/```\s*$/, "");

    try {
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (t: Record<string, unknown>) => typeof t.title === "string" && typeof t.why === "string",
        )
        .slice(0, 4)
        .map((t: { title: string; why: string }) => ({ title: t.title, why: t.why }));
    } catch {
      return [];
    }
  } finally {
    ctx.db.close();
  }
}

// ── Phase 2: Apply refinement ───────────────────────────────────────────────

const APPLY_PROMPT = `You are making a focused refinement to an agent soul based on a specific direction chosen by the user.

## Current Soul

\`\`\`markdown
{{SOUL_CONTENT}}
\`\`\`

## Evidence from Practice

{{EVIDENCE}}

## Chosen Direction

**{{DIRECTION_TITLE}}**
{{DIRECTION_WHY}}

{{USER_NOTES}}

## Constraints

- Make a focused, moderate change addressing the chosen direction.
- Preserve all existing intent and structure. Do not rewrite sections unrelated to the direction.
- Prefer adding or tightening clauses over removing sections.
- Keep the same markdown structure (headings, lists, formatting).
- A soul is an identity definition, not a procedures manual. Stay focused on WHO this agent is and HOW it thinks.
- If the user provided additional notes, incorporate them faithfully.

Respond with ONLY the complete revised soul markdown. No explanation, no preamble, no wrapping code fences — just the raw markdown content that should replace the current file.`;

export async function applySoulRefinement(
  workspace: string,
  filename: string,
  direction: SoulTrail,
  userNotes?: string,
  onPhase?: (phase: string) => void,
): Promise<ApplyRefinementResult> {
  const agentsDir = resolve(workspace, "agents");
  const filePath = join(agentsDir, filename);
  const currentContent = readFileSync(filePath, "utf-8");

  const ctx = await openRefineDb(workspace);
  try {
    onPhase?.("reviewing");
    const evidence = await gatherEvidence(workspace, filename, ctx);

    onPhase?.("refining");
    const { Chat } = await import("chatoyant");

    const notesBlock = userNotes?.trim()
      ? `## Additional User Guidance\n\n${userNotes.trim()}`
      : "";

    const prompt = APPLY_PROMPT.replace("{{SOUL_CONTENT}}", currentContent)
      .replace("{{EVIDENCE}}", evidence)
      .replace("{{DIRECTION_TITLE}}", direction.title)
      .replace("{{DIRECTION_WHY}}", direction.why)
      .replace("{{USER_NOTES}}", notesBlock);

    const applyRun = ctx.runStore.create({
      sessionId: ctx.systemSessionId,
      prompt: `apply: ${direction.title}`,
      agentProfile: "refine",
      model: ctx.model,
    });

    const chat = new Chat({ model: ctx.model });
    let response: string;
    try {
      const result = await chat.user(prompt).generateWithResult();
      response = result.content;
      ctx.runStore.complete(applyRun.id, response.slice(0, 500));
      ctx.runStore.recordUsage(
        applyRun.id,
        result.model,
        result.usage.inputTokens,
        result.usage.outputTokens,
        result.cost.estimatedUsd,
      );
      ctx.sessions.updateSessionTokens(
        ctx.systemSessionId,
        result.usage.inputTokens,
        result.usage.outputTokens,
        result.cost.estimatedUsd,
      );
    } catch (err) {
      ctx.runStore.fail(applyRun.id, err instanceof Error ? err.message : String(err));
      throw err;
    }

    const revised = response.trim();

    if (!revised || revised.length < 20 || revised === currentContent) {
      return {
        revised: false,
        level: getSoulLevel(workspace, filename),
        summary: "Reviewed, no changes needed",
        changelog: "",
      };
    }

    onPhase?.("committing");

    if (!hasSoulHistory(workspace)) initSoulHistory(workspace);
    writeFileSync(filePath, revised, "utf-8");
    commitSouls(workspace, `refine: ${direction.title}`);

    const level = getSoulLevel(workspace, filename);

    onPhase?.("summarizing");

    const gitDiff = getLastCommitDiff(workspace, filename);

    let changelog: string;
    const summaryRun = ctx.runStore.create({
      sessionId: ctx.systemSessionId,
      prompt: `summarize: ${filename}`,
      agentProfile: "refine",
      model: ctx.model,
    });
    try {
      const summaryPrompt =
        "Here is the git diff of a soul file that was just refined. " +
        "Summarize what changed in 2-5 concise bullet points. " +
        "Focus on the behavioral or identity shifts, not line-level edits. " +
        "Use plain language. No preamble, just the bullet points.\n\n" +
        "```diff\n" +
        (gitDiff || "(diff unavailable)") +
        "\n```";
      const summaryResult = await chat.user(summaryPrompt).generateWithResult();
      changelog = summaryResult.content.trim();
      ctx.runStore.complete(summaryRun.id, changelog.slice(0, 500));
      ctx.runStore.recordUsage(
        summaryRun.id,
        summaryResult.model,
        summaryResult.usage.inputTokens,
        summaryResult.usage.outputTokens,
        summaryResult.cost.estimatedUsd,
      );
      ctx.sessions.updateSessionTokens(
        ctx.systemSessionId,
        summaryResult.usage.inputTokens,
        summaryResult.usage.outputTokens,
        summaryResult.cost.estimatedUsd,
      );
    } catch {
      changelog = "Soul was revised but the summary could not be generated.";
      ctx.runStore.fail(summaryRun.id, "summary generation failed");
    }

    return {
      revised: true,
      level,
      summary: `Refined to level ${level}`,
      changelog,
    };
  } finally {
    ctx.db.close();
  }
}
