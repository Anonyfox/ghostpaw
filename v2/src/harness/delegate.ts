import type { Tool } from "chatoyant";
import type { ChatFactory } from "../core/chat/index.ts";
import {
  closeSession,
  createSession,
  executeTurn,
  finalizeDelegation,
  getSession,
  getSessionMessage,
} from "../core/chat/index.ts";
import { getSoulByName, listSouls, MANDATORY_SOUL_IDS } from "../core/souls/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import type { DelegateArgs, DelegateHandler } from "../tools/delegate.ts";
import { checkSpendLimit } from "./check_spend_limit.ts";
import { assembleContext } from "./context.ts";
import { resolveModel } from "./model.ts";
import type { ChannelNotifyFn } from "./notify_background_complete.ts";
import { notifyBackgroundComplete } from "./notify_background_complete.ts";
import type { DelegationOutcome } from "./types.ts";

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
  wardenTools?: Tool[];
  chamberlainTools?: Tool[];
  chatFactory: ChatFactory;
  getParentSessionId: () => number | null;
  onBackgroundComplete?: (parentSessionId: number, outcome: DelegationOutcome) => void;
}

function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  if (typeof timer === "object" && "unref" in timer) timer.unref();
  return fn(ac.signal).finally(() => clearTimeout(timer));
}

export function createDelegateHandler(options: DelegateExecutorOptions): DelegateHandler {
  const {
    db,
    tools,
    mentorTools,
    trainerTools,
    wardenTools,
    chamberlainTools,
    chatFactory,
    getParentSessionId,
  } = options;

  return async (args: DelegateArgs) => {
    const parentSessionId = getParentSessionId();
    if (parentSessionId == null) {
      return { error: "Cannot delegate outside of an active turn." };
    }

    checkSpendLimit(db);

    const model = resolveModel(db, args.model);
    const timeoutMs = args.timeout ? args.timeout * 1000 : DEFAULT_TIMEOUT_MS;
    const specialist = args.specialist ?? "default";

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

    const childSession = createSession(db, `delegate:${Date.now()}`, {
      purpose: "delegate",
      model,
      parentSessionId,
      soulId,
    });
    const childSessionId = childSession.id as number;

    try {
      const systemPrompt = `${assembleContext(db, options.workspace, args.task, soulId)}\n\n${DELEGATE_PREAMBLE}`;
      const isWarden = soulId === MANDATORY_SOUL_IDS.warden;
      const isChamberlain = soulId === MANDATORY_SOUL_IDS.chamberlain;
      const isMentor = soulId === MANDATORY_SOUL_IDS.mentor;
      const isTrainer = soulId === MANDATORY_SOUL_IDS.trainer;
      const effectiveTools =
        isWarden && wardenTools
          ? wardenTools
          : isChamberlain && chamberlainTools
            ? chamberlainTools
            : isMentor && mentorTools
              ? [...tools, ...mentorTools]
              : isTrainer && trainerTools
                ? [...tools, ...trainerTools]
                : tools;

      if (args.background) {
        const channelNotify: ChannelNotifyFn | undefined = options.onBackgroundComplete
          ? (pid, o) => options.onBackgroundComplete!(pid, o)
          : undefined;
        runInBackground(
          db,
          parentSessionId,
          childSessionId,
          specialist,
          systemPrompt,
          model,
          timeoutMs,
          args,
          effectiveTools,
          chatFactory,
          channelNotify,
        );
        return {
          runId: childSessionId,
          status: "running",
          message: `Background task started. Use check_run with run_id=${childSessionId} to poll for results.`,
        };
      }

      return await executeAndFinalize(
        db,
        parentSessionId,
        childSessionId,
        specialist,
        systemPrompt,
        model,
        timeoutMs,
        args,
        effectiveTools,
        chatFactory,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      try {
        closeSession(db, childSessionId, msg);
      } catch {
        /* best-effort */
      }
      return { error: `Delegation failed: ${msg}` };
    }
  };
}

function executeAndFinalize(
  db: DatabaseHandle,
  parentSessionId: number,
  childSessionId: number,
  specialist: string,
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

      finalizeDelegation(
        db,
        parentSessionId,
        childSessionId,
        usage,
        result.succeeded ? undefined : result.content,
      );

      if (!result.succeeded) {
        return { error: `Delegation failed: ${result.content}` } as Record<string, unknown>;
      }
      return `[${specialist} completed]\n\n${result.content}`;
    },
    (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      try {
        closeSession(db, childSessionId, msg);
      } catch {
        /* best-effort */
      }
      return { error: `Delegation failed: ${msg}` } as Record<string, unknown>;
    },
  );
}

function buildOutcome(
  db: DatabaseHandle,
  childSessionId: number,
  parentSessionId: number,
  specialist: string,
): DelegationOutcome {
  const session = getSession(db, childSessionId);
  const failed = session?.error != null;
  const resultContent = getSessionMessage(db, childSessionId, "assistant", "last");

  return {
    childSessionId,
    parentSessionId,
    specialist,
    status: failed ? "failed" : "completed",
    result: failed ? null : (resultContent ?? null),
    error: session?.error ?? null,
  };
}

function runInBackground(
  db: DatabaseHandle,
  parentSessionId: number,
  childSessionId: number,
  specialist: string,
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
    parentSessionId,
    childSessionId,
    specialist,
    systemPrompt,
    model,
    timeoutMs,
    args,
    tools,
    chatFactory,
  )
    .then(() => {
      try {
        const outcome = buildOutcome(db, childSessionId, parentSessionId, specialist);
        notifyBackgroundComplete(db, outcome, channelNotify);
      } catch {
        /* DB may be closed if process is shutting down */
      }
    })
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      try {
        closeSession(db, childSessionId, msg);
      } catch {
        /* best-effort */
      }
      try {
        const outcome = buildOutcome(db, childSessionId, parentSessionId, specialist);
        notifyBackgroundComplete(db, outcome, channelNotify);
      } catch {
        /* DB may be closed if process is shutting down */
      }
    });
}
