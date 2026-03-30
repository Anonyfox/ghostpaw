import { read, type SoulsDb, write } from "@ghostpaw/souls";
import { createAgent } from "../../agent.ts";
import type { RuntimeContext } from "../../runtime.ts";
import { sealSessionTail } from "../chat/seal_session_tail.ts";
import { createSession } from "../chat/session.ts";
import { buildAttunePrompt } from "./attune_prompt.ts";
import { runMaintenance } from "./maintenance.ts";
import { createMentorTools } from "./mentor_tools.ts";
import { renderSoul } from "./render.ts";

export interface AttuneResult {
  phase: "maintenance" | "refinement";
  soulId?: number;
  soulName?: string;
  sessionId?: number;
  succeeded?: boolean;
  fadedShardCount: number;
  readySoulsCount: number;
}

export async function runAttune(ctx: RuntimeContext, signal: AbortSignal): Promise<AttuneResult> {
  const maintenance = runMaintenance(ctx.soulsDb);

  if (maintenance.readySouls.length === 0) {
    return {
      phase: "maintenance",
      fadedShardCount: maintenance.fadedShardCount,
      readySoulsCount: 0,
    };
  }

  if (signal.aborted) {
    return {
      phase: "maintenance",
      fadedShardCount: maintenance.fadedShardCount,
      readySoulsCount: maintenance.readySouls.length,
    };
  }

  const readySoul = maintenance.readySouls.reduce((best, curr) =>
    curr.priorityScore > best.priorityScore ? curr : best,
  );

  const soulsDb = ctx.soulsDb as unknown as SoulsDb;
  const soulRecord = read.getSoul(soulsDb, readySoul.soulId);
  const soulName = soulRecord?.name ?? `soul-${readySoul.soulId}`;

  const mentorTools = createMentorTools(ctx.soulsDb);
  const agent = createAgent({ db: ctx.db, tools: mentorTools });

  const systemPrompt = renderSoul(ctx.soulsDb, ctx.soulIds.mentor);
  const session = createSession(ctx.db, ctx.config.model_small, systemPrompt, {
    purpose: "pulse",
    soulId: ctx.soulIds.mentor,
    title: `attune:${readySoul.soulId}`,
  });

  const prompt = buildAttunePrompt(readySoul, soulName);
  let succeeded = false;
  try {
    const result = await agent.executeTurn(session.id, prompt, {
      model: ctx.config.model_small,
    });
    succeeded = result.succeeded;
  } finally {
    sealSessionTail(ctx.db, session.id);
  }

  if (succeeded) {
    write.stampAttuned(soulsDb, readySoul.soulId);
  }

  return {
    phase: "refinement",
    soulId: readySoul.soulId,
    soulName,
    sessionId: session.id,
    succeeded,
    fadedShardCount: maintenance.fadedShardCount,
    readySoulsCount: maintenance.readySouls.length,
  };
}
