import type { Tool } from "chatoyant";
import { createAgent } from "../../agent.ts";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { sealSessionTail } from "../chat/seal_session_tail.ts";
import { createSession } from "../chat/session.ts";
import { renderSoul } from "../souls/render.ts";

const DELEGATION_PREAMBLE =
  "You are executing a delegated task. Complete it thoroughly. You cannot delegate further.\n\n";

export interface ExecuteDelegationArgs {
  db: DatabaseHandle;
  soulsDb: DatabaseHandle;
  soulId: number;
  task: string;
  tools: Tool[];
  model: string;
}

export interface DelegationResult {
  succeeded: boolean;
  content: string;
  sessionId: number;
  soulId: number;
}

export async function executeDelegation(args: ExecuteDelegationArgs): Promise<DelegationResult> {
  const { db, soulsDb, soulId, task, tools, model } = args;

  const systemPrompt = renderSoul(soulsDb, soulId);
  const session = createSession(db, model, systemPrompt, {
    purpose: "delegate",
    soulId,
    title: `delegate:${soulId}`,
  });

  const agent = createAgent({ db, tools });
  const userMessage = DELEGATION_PREAMBLE + task;

  let succeeded = false;
  let content = "";
  try {
    const result = await agent.executeTurn(session.id, userMessage, {
      model,
      maxIterations: 100,
    });
    succeeded = result.succeeded;
    content = result.content;
  } catch (err) {
    content = err instanceof Error ? err.message : String(err);
  } finally {
    sealSessionTail(db, session.id);
  }

  return { succeeded, content, sessionId: session.id, soulId };
}
