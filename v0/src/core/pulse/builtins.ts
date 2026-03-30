import type { RuntimeContext } from "../../runtime.ts";
import { listUnsealedStaleSessions } from "../chat/list_unsealed_stale_sessions.ts";
import { sealSessionTail } from "../chat/seal_session_tail.ts";
import { runTend } from "../innkeeper/tend.ts";
import { runShadeIngest } from "../shade/ingest.ts";
import { runShardsProcessor } from "../shade/shards.ts";
import { runAttune } from "../souls/attune.ts";
import type { BuiltinHandler, JobResult } from "./types.ts";

const STALE_AFTER_MINUTES = 360;

export async function heartbeatHandler(
  ctx: RuntimeContext,
  _signal: AbortSignal,
): Promise<JobResult> {
  const { db } = ctx;
  const untitled = db
    .prepare("SELECT COUNT(*) as c FROM sessions WHERE purpose = 'chat' AND title IS NULL")
    .get() as { c: number };
  const failing = db
    .prepare(
      "SELECT COUNT(*) as c FROM pulses WHERE last_exit_code IS NOT NULL AND last_exit_code != 0",
    )
    .get() as { c: number };
  const active = db.prepare("SELECT COUNT(*) as c FROM pulses WHERE running = 1").get() as {
    c: number;
  };
  const pageRow = db.prepare("PRAGMA page_count").get() as { page_count: number } | undefined;
  const pageCount = pageRow?.page_count ?? 0;

  const checks = {
    untitled_chat_sessions: untitled.c,
    failing_pulses: failing.c,
    running_pulses: active.c,
    db_page_count: pageCount,
  };

  return {
    exitCode: 0,
    output: JSON.stringify(checks),
  };
}

export async function sealSweepHandler(
  ctx: RuntimeContext,
  _signal: AbortSignal,
): Promise<JobResult> {
  const { db } = ctx;
  const stale = listUnsealedStaleSessions(db, STALE_AFTER_MINUTES);
  let sealed = 0;
  for (const s of stale) {
    sealed += sealSessionTail(db, s.id);
  }
  return {
    exitCode: 0,
    output: JSON.stringify({ stale_sessions_found: stale.length, messages_sealed: sealed }),
  };
}

export async function shadeIngestHandler(
  ctx: RuntimeContext,
  signal: AbortSignal,
): Promise<JobResult> {
  const result = await runShadeIngest(ctx.db, ctx.config.model_small, signal);
  return {
    exitCode: 0,
    output: JSON.stringify(result),
  };
}

export async function shadeShardsHandler(
  ctx: RuntimeContext,
  signal: AbortSignal,
): Promise<JobResult> {
  const result = await runShardsProcessor(ctx.db, ctx.soulsDb, ctx.config.model_small, signal);
  return {
    exitCode: 0,
    output: JSON.stringify(result),
  };
}

export async function attuneHandler(ctx: RuntimeContext, signal: AbortSignal): Promise<JobResult> {
  const result = await runAttune(ctx, signal);
  return {
    exitCode: 0,
    output: JSON.stringify(result),
  };
}

export async function tendHandler(ctx: RuntimeContext, signal: AbortSignal): Promise<JobResult> {
  const result = await runTend(ctx, signal);
  return {
    exitCode: 0,
    output: JSON.stringify(result),
  };
}

export const BUILTINS: Record<string, BuiltinHandler> = {
  heartbeat: heartbeatHandler,
  seal_sweep: sealSweepHandler,
  shade_ingest: shadeIngestHandler,
  shade_shards: shadeShardsHandler,
  attune: attuneHandler,
  tend: tendHandler,
};

export async function runBuiltin(
  ctx: RuntimeContext,
  command: string,
  signal: AbortSignal,
): Promise<JobResult> {
  const handler = BUILTINS[command];
  if (!handler) {
    return { exitCode: 1, error: `unknown builtin: ${command}` };
  }
  return handler(ctx, signal);
}
