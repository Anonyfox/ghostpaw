import { Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { nextOrdinal } from "../chat/messages.ts";
import type { InterceptorConfig } from "../settings/build_config.ts";
import { filterContextForSubsystem } from "./context_filter.ts";
import type { SubsystemDefinition, SubsystemRegistry } from "./registry.ts";

export interface SyntheticEntry {
  subsystemName: string;
  callId: string;
  summary: string;
}

export interface InterceptorOptions {
  chatDb: DatabaseHandle;
  subsystemDbs: Map<string, DatabaseHandle>;
  registry: SubsystemRegistry;
  config: InterceptorConfig;
  sessionId: number;
  triggerMessageId: number;
  modelSmall: string;
}

/**
 * Builds a clean chatoyant Message[] from filtered rows for the subsystem.
 *
 * Key constraint: LLM providers reject tool messages whose tool_call_id
 * doesn't match a tool_calls entry on a preceding assistant message. The
 * context filter returns raw rows including synthetic assistant+tool pairs,
 * but reconstructing the full tool_call protocol is fragile and unnecessary.
 *
 * Instead: user messages and organic assistant text are kept as-is. Prior
 * subsystem summaries (synthetic tool results) are inlined as user context
 * notes so the scribe can see its own prior work without protocol coupling.
 * Synthetic assistant stubs (empty content, only existed to hold tool_calls)
 * are dropped.
 */
function buildSubsystemContext(
  rows: { role: string; content: string; tool_call_id: string | null; source: string }[],
): Message[] {
  const messages: Message[] = [];

  for (const row of rows) {
    if (row.role === "user") {
      messages.push(new Message("user", row.content));
      continue;
    }

    if (row.role === "assistant") {
      if (row.source === "synthetic" && !row.content) continue;
      if (row.content) messages.push(new Message("assistant", row.content));
      continue;
    }

    if (row.role === "tool" && row.source === "synthetic" && row.content) {
      messages.push(new Message("user", `[prior subsystem result]\n${row.content}`));
    }
  }

  return messages;
}

async function runOneSubsystem(
  def: SubsystemDefinition,
  opts: InterceptorOptions,
  subsystemConfig: {
    lookback: number;
    max_iterations: number;
    timeout_ms: number;
  },
): Promise<SyntheticEntry | null> {
  const { chatDb, subsystemDbs, sessionId, triggerMessageId, modelSmall } = opts;
  const db = subsystemDbs.get(def.name);
  if (!db) return null;

  const filtered = filterContextForSubsystem(chatDb, sessionId, def.name, subsystemConfig.lookback);

  const context = buildSubsystemContext(filtered);
  if (context.length === 0) return null;

  const result = await def.run({
    db,
    chatDb,
    parentSessionId: sessionId,
    triggerMessageId,
    context,
    model: modelSmall,
    maxIterations: subsystemConfig.max_iterations,
    timeoutMs: subsystemConfig.timeout_ms,
  });

  if (!result.succeeded) return null;

  const callId = `ic_${def.name}_${triggerMessageId}`;
  return {
    subsystemName: def.name,
    callId,
    summary: result.summary,
  };
}

/**
 * Runs enabled subsystems concurrently, collects summaries, and persists
 * them as synthetic tool call entries in the parent session.
 *
 * Returns the synthetic entries that were persisted (for logging/debugging).
 */
export async function runInterceptor(opts: InterceptorOptions): Promise<SyntheticEntry[]> {
  const { config, registry, chatDb, sessionId } = opts;

  if (!config.enabled) return [];

  const subsystems = registry.list();
  if (subsystems.length === 0) return [];

  const tasks: Promise<SyntheticEntry | null>[] = [];

  for (const def of subsystems) {
    const subConfig = config.subsystems[def.name];
    if (!subConfig?.enabled) continue;

    tasks.push(
      runOneSubsystem(def, opts, {
        lookback: subConfig.lookback ?? def.defaultLookback,
        max_iterations: subConfig.max_iterations ?? 15,
        timeout_ms: subConfig.timeout_ms ?? def.defaultTimeoutMs,
      }).catch((err) => {
        console.error(
          `[interceptor] ${def.name} failed:`,
          err instanceof Error ? err.message : err,
        );
        return null;
      }),
    );
  }

  const results = await Promise.all(tasks);
  const entries = results.filter((r): r is SyntheticEntry => r !== null && r.summary.length > 0);

  if (entries.length === 0) return [];

  persistSyntheticEntries(chatDb, sessionId, entries);
  return entries;
}

function persistSyntheticEntries(
  db: DatabaseHandle,
  sessionId: number,
  entries: SyntheticEntry[],
): void {
  let ordinal = nextOrdinal(db, sessionId);

  db.exec("BEGIN");
  try {
    const insertMsg = db.prepare(
      `INSERT INTO messages (session_id, ordinal, role, content, source, tool_call_id)
       VALUES (?, ?, ?, ?, 'synthetic', ?)`,
    );
    const insertTc = db.prepare(
      "INSERT INTO tool_calls (id, message_id, name, arguments) VALUES (?, ?, ?, ?)",
    );

    const assistantResult = insertMsg.run(sessionId, ordinal++, "assistant", "", null);
    const assistantMsgId = Number(assistantResult.lastInsertRowid);

    for (const entry of entries) {
      insertTc.run(entry.callId, assistantMsgId, `subsystem_${entry.subsystemName}`, "{}");
    }

    for (const entry of entries) {
      insertMsg.run(sessionId, ordinal++, "tool", entry.summary, entry.callId);
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
