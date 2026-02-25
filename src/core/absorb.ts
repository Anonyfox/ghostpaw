/**
 * Session absorption — extracts learnings from unprocessed conversations
 * and stores them as memories. Phase 1 of the training pipeline.
 */

import { Chat } from "chatoyant";
import type { EmbeddingProvider } from "../lib/embedding.js";
import type { GhostpawDatabase } from "./database.js";
import type { MemoryStore } from "./memory.js";
import { createRunStore } from "./runs.js";
import { getOrCreateSystemSession, type Message, type SessionStore } from "./session.js";

const EXTRACTION_PROMPT = `Extract key learnings from the conversation below. For each learning, write ONE concise sentence capturing what was learned, discovered, corrected, or preferred.

Rules:
- Only extract genuinely useful learnings (corrections, preferences, discoveries, successful approaches, mistakes to avoid)
- Skip routine exchanges, greetings, and status checks
- Each learning must be self-contained and useful without the original conversation
- Include specific details (file names, commands, preferences) that make the learning actionable
- Return 0 learnings if the conversation was routine with nothing notable

Return ONLY valid JSON: {"learnings": ["...", "..."]}`;

export function formatConversation(messages: Message[]): string {
  const parts: string[] = [];
  for (const msg of messages) {
    if (!msg.content) continue;
    if (msg.isCompaction) continue;
    const role = msg.role === "user" ? "User" : msg.role === "assistant" ? "Agent" : "System";
    const content = msg.content.length > 2000 ? `${msg.content.slice(0, 2000)}...` : msg.content;
    parts.push(`${role}: ${content}`);
  }
  return parts.join("\n\n");
}

export function parseLearnings(response: string): string[] {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    if (Array.isArray(parsed.learnings)) {
      return parsed.learnings.filter((l: unknown) => typeof l === "string" && l.trim().length > 10);
    }
  } catch {
    return response
      .split("\n")
      .map((l) => l.replace(/^[-*\d.]+\s*/, "").trim())
      .filter((l) => l.length > 10 && !l.startsWith("{") && !l.startsWith("["));
  }
  return [];
}

export interface AbsorbConfig {
  db: GhostpawDatabase;
  sessions: SessionStore;
  memory: MemoryStore;
  embedding: EmbeddingProvider;
  model: string;
}

export interface AbsorbResult {
  absorbed: number;
  memoriesCreated: number;
  skipped: number;
}

const MIN_MESSAGES_TO_ABSORB = 2;
const MAX_LEARNINGS_PER_SESSION = 10;
const MAX_LEARNINGS_PER_RUN = 100;
const MAX_CONVERSATION_CHARS = 30_000;

export async function absorbSessions(config: AbsorbConfig): Promise<AbsorbResult> {
  const { db, sessions, memory, embedding, model } = config;

  const runStore = createRunStore(db);
  const sysSessionId = getOrCreateSystemSession(sessions);

  sessions.pruneGhostSessions();

  const unabsorbed = sessions.listUnabsorbed();
  let absorbed = 0;
  let memoriesCreated = 0;
  let skipped = 0;

  for (const session of unabsorbed) {
    if (memoriesCreated >= MAX_LEARNINGS_PER_RUN) {
      break;
    }

    const history = sessions.getConversationHistory(session.id);

    if (history.length < MIN_MESSAGES_TO_ABSORB) {
      sessions.markAbsorbed(session.id);
      skipped++;
      continue;
    }

    let conversation = formatConversation(history);
    if (conversation.length < 50) {
      sessions.markAbsorbed(session.id);
      skipped++;
      continue;
    }

    if (conversation.length > MAX_CONVERSATION_CHARS) {
      conversation = `${conversation.slice(0, MAX_CONVERSATION_CHARS)}\n\n[conversation truncated]`;
    }

    const run = runStore.create({
      sessionId: sysSessionId,
      prompt: `absorb: ${session.key}`,
      agentProfile: "absorb",
      model,
    });

    try {
      const chat = new Chat({ model });
      chat.system(EXTRACTION_PROMPT);
      chat.user(conversation);
      const genResult = await chat.generateWithResult();

      runStore.complete(run.id, genResult.content.slice(0, 500));
      runStore.recordUsage(
        run.id,
        genResult.model,
        genResult.usage.inputTokens,
        genResult.usage.outputTokens,
        genResult.cost.estimatedUsd,
      );
      sessions.updateSessionTokens(
        sysSessionId,
        genResult.usage.inputTokens,
        genResult.usage.outputTokens,
        genResult.cost.estimatedUsd,
      );

      const learnings = parseLearnings(genResult.content).slice(0, MAX_LEARNINGS_PER_SESSION);
      const remaining = MAX_LEARNINGS_PER_RUN - memoriesCreated;
      const toStore = learnings.slice(0, remaining);

      const prepared: { text: string; vec: number[] }[] = [];
      for (const learning of toStore) {
        const vec = await embedding.embed(learning);
        prepared.push({ text: learning, vec });
      }

      db.sqlite.exec("BEGIN");
      try {
        for (const { text, vec } of prepared) {
          memory.store(text, vec, { source: "absorbed", sessionId: session.id });
        }
        sessions.markAbsorbed(session.id);
        db.sqlite.exec("COMMIT");
      } catch (txErr) {
        db.sqlite.exec("ROLLBACK");
        throw txErr;
      }

      memoriesCreated += prepared.length;
    } catch (err) {
      runStore.fail(run.id, err instanceof Error ? err.message : String(err));
      sessions.markAbsorbed(session.id);
    }

    absorbed++;
  }

  return { absorbed, memoriesCreated, skipped };
}

/** Lightweight count of sessions ready for absorption (no LLM calls). */
export function countUnabsorbedSessions(sessions: SessionStore): number {
  return sessions.countUnabsorbed();
}
