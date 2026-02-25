/**
 * Scout engine — creative ideation that discovers unexplored skill
 * opportunities by mining accumulated context (memories, sessions, skills,
 * workspace) for friction signals and capability gaps.
 *
 * Two modes:
 *   Directionless  → friction mining, returns trail suggestions
 *   Directed       → full agent run with tools, returns a trail report
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Chat } from "chatoyant";
import { banner, blank, label, log, style } from "../lib/terminal.js";

declare const __VERSION__: string;
let VERSION: string;
try {
  VERSION = __VERSION__;
} catch {
  VERSION = "dev";
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface ScoutTrail {
  title: string;
  why: string;
}

export interface ScoutResult {
  mode: "suggest" | "report";
  trails?: ScoutTrail[];
  direction?: string;
  report?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const MAX_TRAILS = 5;
const MAX_MEMORIES = 50;
const MAX_SESSIONS = 20;
export const MAX_CONTEXT_CHARS = 30_000;

const FRICTION_PROMPT = `You are analyzing a user's agent workspace to discover unexplored automation opportunities.

Context provided:
- Recent memories (what the user has been doing/learning)
- Current skills (what the agent already knows)
- Recent session summaries (conversation patterns)

Find FRICTION — things the user does repeatedly, struggles with, mentions wanting,
or obviously could benefit from but hasn't asked for. Each suggestion must be:
- Grounded in specific evidence from the context (cite the exact memory or session)
- Genuinely new — not something any existing skill already handles, and not a refinement, improvement, or alternative approach to an existing skill's function. If a skill already serves the core purpose, it belongs in training, not scouting.
- Actionable (something a skill could realistically automate or assist with)
- Specific to THIS user (not generic productivity advice)

Return 3-5 trails as JSON: {"trails": [{"title": "...", "why": "..."}]}

If there isn't enough context to suggest anything meaningful, return {"trails": []}
— never fabricate suggestions without evidence.`;

const FALLBACK_SCOUT_PROMPT = `You are scouting a new direction for skill development. Research this topic thoroughly:

1. Read relevant existing skills to understand current coverage — if this direction is essentially a better version of an existing skill, say so and recommend improving it through training instead
2. Recall related memories for context
3. If external tools or unfamiliar technologies are involved, web search for approaches and best practices — skip if the direction only involves reorganizing existing workflows
4. Analyze what's specifically useful for THIS user given their context
5. Produce a trail report: concrete description, why it's valuable, what a skill would look like, specific first steps
6. End with a clear invitation: the user can craft this into a skill

Be specific and grounded. Suggestions must be accessible to non-coders.
Never suggest capabilities the agent doesn't have.
Never suggest skills that duplicate or refine what an existing skill already handles.`;

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractSkillDescription(content: string): string {
  const lines = content.split("\n");
  let pastTitle = false;
  const para: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!pastTitle) {
      if (trimmed.startsWith("#")) pastTitle = true;
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
  return desc.length > 120 ? `${desc.slice(0, 117)}...` : desc;
}

// ── Parsing ──────────────────────────────────────────────────────────────────

export function parseFrictionTrails(response: string): ScoutTrail[] {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.trails)) return [];

    return parsed.trails
      .filter(
        (t: unknown): t is { title: string; why: string } =>
          typeof t === "object" &&
          t !== null &&
          typeof (t as Record<string, unknown>).title === "string" &&
          typeof (t as Record<string, unknown>).why === "string" &&
          ((t as Record<string, unknown>).title as string).trim().length > 0 &&
          ((t as Record<string, unknown>).why as string).trim().length > 0,
      )
      .slice(0, MAX_TRAILS);
  } catch {
    return [];
  }
}

// ── Context assembly ─────────────────────────────────────────────────────────

export interface ScoutContextConfig {
  workspacePath: string;
  memories: Array<{ content: string }>;
  sessions: Array<{ key: string; firstUserMessage?: string }>;
}

export function assembleScoutContext(config: ScoutContextConfig): string {
  const sections: string[] = [];

  // Memories
  const mems = config.memories.slice(0, MAX_MEMORIES);
  if (mems.length > 0) {
    const lines = mems.map((m) => `- ${m.content}`);
    sections.push(`## Recent Memories (${mems.length})\n\n${lines.join("\n")}`);
  } else {
    sections.push("## Recent Memories\n\nNo memories yet.");
  }

  // Skill index with descriptions so the LLM can judge overlap
  const skillsDir = join(config.workspacePath, "skills");
  const skillEntries: string[] = [];
  if (existsSync(skillsDir)) {
    try {
      for (const f of readdirSync(skillsDir)
        .filter((f) => f.endsWith(".md"))
        .sort()) {
        const content = readFileSync(join(skillsDir, f), "utf-8").trim();
        const titleLine = content.split("\n").find((l) => l.trim().startsWith("#"));
        const title = titleLine ? titleLine.replace(/^#+\s*/, "").trim() : "(untitled)";
        const desc = extractSkillDescription(content);
        skillEntries.push(desc ? `- ${f}: ${title} — ${desc}` : `- ${f}: ${title}`);
      }
    } catch {
      // unreadable
    }
  }
  if (skillEntries.length > 0) {
    sections.push(`## Current Skills (${skillEntries.length})\n\n${skillEntries.join("\n")}`);
  } else {
    sections.push("## Current Skills\n\nNo skills yet.");
  }

  // Session previews
  const sess = config.sessions.slice(0, MAX_SESSIONS);
  if (sess.length > 0) {
    const lines = sess
      .filter((s) => s.firstUserMessage)
      .map((s) => `- [${s.key}] ${s.firstUserMessage}`);
    if (lines.length > 0) {
      sections.push(`## Recent Sessions (${lines.length})\n\n${lines.join("\n")}`);
    } else {
      sections.push("## Recent Sessions\n\nNo session content available.");
    }
  } else {
    sections.push("## Recent Sessions\n\nNo sessions yet.");
  }

  // Workspace structure
  const wsEntries: string[] = [];
  try {
    for (const entry of readdirSync(config.workspacePath)) {
      if (WORKSPACE_IGNORE.has(entry)) continue;
      wsEntries.push(entry);
    }
  } catch {
    // unreadable
  }
  if (wsEntries.length > 0) {
    sections.push(`## Workspace Structure\n\n${wsEntries.join(", ")}`);
  }

  let context = sections.join("\n\n");
  if (context.length > MAX_CONTEXT_CHARS) {
    context = `${context.slice(0, MAX_CONTEXT_CHARS)}\n\n[context truncated]`;
  }
  return context;
}

// ── Scout entry points ───────────────────────────────────────────────────────

/** Build the prompt for a directed scout. Exported for REPL integration. */
export function buildScoutPrompt(workspace: string, direction: string): string {
  const skillPath = join(workspace, "skills", "skill-scout.md");
  try {
    if (existsSync(skillPath)) {
      const content = readFileSync(skillPath, "utf-8").trim();
      if (content.length > 50) {
        return `Follow the scout playbook below to research this direction: "${direction}"\n\n${content}`;
      }
    }
  } catch {
    // fall through
  }
  return `${FALLBACK_SCOUT_PROMPT}\n\nDirection to scout: "${direction}"`;
}

export const WORKSPACE_IGNORE = new Set([
  ".ghostpaw",
  "node_modules",
  ".git",
  "ghostpaw.db",
  "ghostpaw.db-wal",
  "ghostpaw.db-shm",
]);

async function gatherContext(workspace: string): Promise<ScoutContextConfig> {
  const { createDatabase } = await import("./database.js");
  const { createSessionStore } = await import("./session.js");
  const { createMemoryStore } = await import("./memory.js");
  const { createSecretStore } = await import("./secrets.js");

  const dbPath = resolve(workspace, "ghostpaw.db");
  const db = await createDatabase(dbPath);

  try {
    const secrets = createSecretStore(db);
    secrets.loadIntoEnv();
    secrets.syncProviderKeys();

    const sessionStore = createSessionStore(db);
    const memoryStore = createMemoryStore(db);

    const memories = memoryStore.list().slice(0, MAX_MEMORIES);
    const allSessions = sessionStore.listSessions().slice(0, MAX_SESSIONS);
    const sessionsWithPreview = allSessions.map((s) => {
      const history = sessionStore.getConversationHistory(s.id);
      const firstUser = history.find((m) => m.role === "user" && !m.isCompaction);
      const content = firstUser?.content ?? "";
      return {
        key: s.key,
        firstUserMessage: content.length > 200 ? `${content.slice(0, 200)}...` : content,
      };
    });

    return { workspacePath: workspace, memories, sessions: sessionsWithPreview };
  } finally {
    db.close();
  }
}

async function runFrictionMining(workspace: string): Promise<ScoutTrail[]> {
  const { loadConfig } = await import("./config.js");
  const { createDatabase } = await import("./database.js");
  const { createSecretStore } = await import("./secrets.js");
  const { createSessionStore, getOrCreateSystemSession } = await import("./session.js");
  const { createRunStore } = await import("./runs.js");

  const dbPath = resolve(workspace, "ghostpaw.db");
  const db = await createDatabase(dbPath);

  try {
    const secrets = createSecretStore(db);
    secrets.loadIntoEnv();
    secrets.syncProviderKeys();
    const config = await loadConfig(workspace);
    const model = config.models.default;

    const sessions = createSessionStore(db);
    const runStore = createRunStore(db);
    const sysSessionId = getOrCreateSystemSession(sessions);

    const context = await gatherContext(workspace);
    const contextStr = assembleScoutContext(context);

    const run = runStore.create({
      sessionId: sysSessionId,
      prompt: "friction mining",
      agentProfile: "scout",
      model,
    });

    const chat = new Chat({ model });
    chat.system(FRICTION_PROMPT);
    chat.user(contextStr);

    try {
      const result = await chat.generateWithResult();
      runStore.complete(run.id, result.content.slice(0, 500));
      runStore.recordUsage(
        run.id,
        result.model,
        result.usage.inputTokens,
        result.usage.outputTokens,
        result.cost.estimatedUsd,
      );
      sessions.updateSessionTokens(
        sysSessionId,
        result.usage.inputTokens,
        result.usage.outputTokens,
        result.cost.estimatedUsd,
      );
      return parseFrictionTrails(result.content);
    } catch (err) {
      runStore.fail(run.id, err instanceof Error ? err.message : String(err));
      throw err;
    }
  } finally {
    db.close();
  }
}

/** Non-streaming entry point for programmatic use. */
export async function runScout(workspace: string, direction?: string): Promise<ScoutResult> {
  if (!direction) {
    const trails = await runFrictionMining(workspace);
    return { mode: "suggest", trails };
  }

  const { createAgent } = await import("../index.js");
  const prompt = buildScoutPrompt(workspace, direction);
  const agent = await createAgent({
    workspace,
    excludeTools: ["train", "scout"],
    purpose: "scout",
  });
  const report = await agent.run(prompt);

  return { mode: "report", direction, report };
}

/** Streaming/TTY entry point — prints to terminal. */
export async function scout(
  workspace: string,
  opts: { stream?: boolean; direction?: string } = {},
): Promise<void> {
  blank();
  banner("ghostpaw", VERSION);

  if (!opts.direction) {
    log.info("Scouting — sniffing out new trails...");
    blank();

    const trails = await runFrictionMining(workspace);

    if (trails.length === 0) {
      log.info(
        "Not enough experience yet — try /scout <direction> with a specific idea, or use me for a while and scout again later.",
      );
      blank();
      return;
    }

    for (let i = 0; i < trails.length; i++) {
      label(`${i + 1}`, style.bold(trails[i]!.title), style.boldCyan);
      label("", trails[i]!.why, style.dim);
      blank();
    }

    log.info("Pick a trail and run: ghostpaw scout <direction>");
    blank();
    return;
  }

  log.info(`Scouting — ${opts.direction}`);
  blank();

  if (opts.stream) {
    const { createAgent } = await import("../index.js");
    const prompt = buildScoutPrompt(workspace, opts.direction);
    const agent = await createAgent({
      workspace,
      excludeTools: ["train", "scout"],
      purpose: "scout",
    });

    process.stdout.write(style.dim("ghostpaw "));
    for await (const chunk of agent.stream(prompt)) {
      process.stdout.write(chunk);
    }
    process.stdout.write("\n");
    blank();

    label("scouted", style.bold(opts.direction), style.boldGreen);
    label(
      "",
      "Describe what to adjust, or start a new session to craft this into a skill.",
      style.dim,
    );
    blank();
  } else {
    const result = await runScout(workspace, opts.direction);
    if (result.report) {
      console.log(result.report);
      blank();
      label("scouted", style.bold(opts.direction), style.boldGreen);
      blank();
    }
  }
}
