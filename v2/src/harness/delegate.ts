import type { Tool } from "chatoyant";
import type { ChatFactory } from "../core/chat/index.ts";
import { accumulateUsage, closeSession, createSession, executeTurn } from "../core/chat/index.ts";
import type { DelegationRun } from "../core/runs/index.ts";
import {
  completeRun,
  createRun,
  failRun,
  getRun,
  linkChildSession,
  recordRunUsage,
} from "../core/runs/index.ts";
import { getSoulByName, listSouls, MANDATORY_SOUL_IDS } from "../core/souls/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import type { DelegateArgs, DelegateHandler } from "../tools/delegate.ts";
import { checkSpendLimit } from "./check_spend_limit.ts";
import { assembleContext } from "./context.ts";
import { resolveModel } from "./model.ts";
import type { ChannelNotifyFn } from "./notify_background_complete.ts";
import { notifyBackgroundComplete } from "./notify_background_complete.ts";

const DEFAULT_TIMEOUT_MS = 1_800_000;
const CHILD_MAX_ITERATIONS = 15;

const DELEGATE_PREAMBLE = [
  "## Delegation",
  "",
  "You are executing a delegated task. Complete it thoroughly and return your result.",
  "You cannot delegate to other agents.",
].join("\n");

export interface DelegateExecutorOptions {
  db: DatabaseHandle;
  workspace: string;
  tools: Tool[];
  mentorTools?: Tool[];
  trainerTools?: Tool[];
  chatFactory: ChatFactory;
  getParentSessionId: () => number | null;
  onBackgroundComplete?: (parentSessionId: number, run: DelegationRun) => void;
}

function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  if (typeof timer === "object" && "unref" in timer) timer.unref();
  return fn(ac.signal).finally(() => clearTimeout(timer));
}

export function createDelegateHandler(options: DelegateExecutorOptions): DelegateHandler {
  const { db, tools, mentorTools, trainerTools, chatFactory, getParentSessionId } = options;

  return async (args: DelegateArgs) => {
    const parentSessionId = getParentSessionId();
    if (parentSessionId == null) {
      return { error: "Cannot delegate outside of an active turn." };
    }

    checkSpendLimit(db);

    const model = resolveModel(db, args.model);
    const timeoutMs = args.timeout ? args.timeout * 1000 : DEFAULT_TIMEOUT_MS;

    let soulId: number = MANDATORY_SOUL_IDS.ghostpaw;
    if (args.specialist) {
      const soul = getSoulByName(db, args.specialist);
      if (!soul) {
        const available = listSouls(db)
          .filter((s) => s.id !== MANDATORY_SOUL_IDS.ghostpaw)
          .map((s) => s.name);
        return {
          error: `Unknown specialist "${args.specialist}". Available: ${available.join(", ") || "none"}`,
        };
      }
      soulId = soul.id;
    }

    const run = createRun(db, {
      parentSessionId,
      specialist: args.specialist ?? "default",
      model,
      task: args.task,
    });
    let childSessionId: number | null = null;

    try {
      const childSession = createSession(db, `delegate:${run.id}`, {
        purpose: "delegate",
        model,
        parentSessionId,
      });
      childSessionId = childSession.id as number;
      linkChildSession(db, run.id, childSessionId);

      const systemPrompt = `${assembleContext(db, options.workspace, args.task, soulId)}\n\n${DELEGATE_PREAMBLE}`;
      const isMentor = soulId === MANDATORY_SOUL_IDS.mentor;
      const isTrainer = soulId === MANDATORY_SOUL_IDS.trainer;
      const effectiveTools =
        isMentor && mentorTools
          ? [...tools, ...mentorTools]
          : isTrainer && trainerTools
            ? [...tools, ...trainerTools]
            : tools;

      if (args.background) {
        const channelNotify: ChannelNotifyFn | undefined = options.onBackgroundComplete
          ? (pid, r) => options.onBackgroundComplete!(pid, r)
          : undefined;
        runInBackground(
          db,
          run,
          parentSessionId,
          childSessionId,
          systemPrompt,
          model,
          timeoutMs,
          args,
          effectiveTools,
          chatFactory,
          channelNotify,
        );
        return {
          runId: run.id,
          status: "running",
          message: `Background task started. Use check_run with run_id=${run.id} to poll for results.`,
        };
      }

      return await executeAndFinalize(
        db,
        run,
        parentSessionId,
        childSessionId,
        systemPrompt,
        model,
        timeoutMs,
        args,
        effectiveTools,
        chatFactory,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      safeFailRun(db, run.id, childSessionId, msg);
      return { error: `Delegation failed: ${msg}` };
    }
  };
}

function executeAndFinalize(
  db: DatabaseHandle,
  run: { id: number },
  parentSessionId: number,
  childSessionId: number,
  systemPrompt: string,
  model: string,
  timeoutMs: number,
  args: DelegateArgs,
  tools: Tool[],
  chatFactory: ChatFactory,
): Promise<string | Record<string, unknown>> {
  return withTimeout(
    (signal) =>
      executeTurn(
        {
          sessionId: childSessionId,
          content: args.task,
          systemPrompt,
          model,
          maxIterations: CHILD_MAX_ITERATIONS,
          abortSignal: signal,
        },
        { db, tools, createChat: chatFactory },
      ),
    timeoutMs,
  ).then(
    (result) => {
      const usage = {
        tokensIn: result.usage.inputTokens,
        tokensOut: result.usage.outputTokens,
        reasoningTokens: result.usage.reasoningTokens,
        cachedTokens: result.usage.cachedTokens,
        costUsd: result.cost.estimatedUsd,
      };

      db.exec("BEGIN");
      try {
        if (result.succeeded) {
          completeRun(db, run.id, result.content);
        } else {
          failRun(db, run.id, result.content);
        }
        recordRunUsage(db, run.id, usage);
        accumulateUsage(db, parentSessionId, usage);
        closeSession(db, childSessionId);
        db.exec("COMMIT");
      } catch (txErr) {
        db.exec("ROLLBACK");
        throw txErr;
      }

      if (!result.succeeded) {
        return { error: `Delegation failed: ${result.content}` } as Record<string, unknown>;
      }
      const label = args.specialist ?? "default";
      return `[${label} completed]\n\n${result.content}`;
    },
    (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      db.exec("BEGIN");
      try {
        failRun(db, run.id, msg);
        closeSession(db, childSessionId);
        db.exec("COMMIT");
      } catch (txErr) {
        db.exec("ROLLBACK");
        throw txErr;
      }
      return { error: `Delegation failed: ${msg}` } as Record<string, unknown>;
    },
  );
}

function runInBackground(
  db: DatabaseHandle,
  run: { id: number },
  parentSessionId: number,
  childSessionId: number,
  systemPrompt: string,
  model: string,
  timeoutMs: number,
  args: DelegateArgs,
  tools: Tool[],
  chatFactory: ChatFactory,
  channelNotify?: ChannelNotifyFn,
): void {
  executeAndFinalize(
    db,
    run,
    parentSessionId,
    childSessionId,
    systemPrompt,
    model,
    timeoutMs,
    args,
    tools,
    chatFactory,
  )
    .then(() => {
      try {
        const completedRun = getRun(db, run.id);
        if (completedRun) notifyBackgroundComplete(db, completedRun, channelNotify);
      } catch {
        /* DB may be closed if process is shutting down */
      }
    })
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      safeFailRun(db, run.id, childSessionId, msg);
      try {
        const failedRun = getRun(db, run.id);
        if (failedRun) notifyBackgroundComplete(db, failedRun, channelNotify);
      } catch {
        /* DB may be closed if process is shutting down */
      }
    });
}

function safeFailRun(
  db: DatabaseHandle,
  runId: number,
  childSessionId: number | null,
  error: string,
): void {
  try {
    db.exec("BEGIN");
    failRun(db, runId, error);
    if (childSessionId != null) closeSession(db, childSessionId);
    db.exec("COMMIT");
  } catch (_) {
    try {
      db.exec("ROLLBACK");
    } catch (_2) {
      /* DB is irrecoverable */
    }
  }
}
