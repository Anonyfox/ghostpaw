import type { Tool } from "chatoyant";
import type { RuntimeContext } from "../../runtime.ts";
import { createAskMentorTool } from "./ask_mentor_tool.ts";
import { createDelegateTool } from "./delegate_tool.ts";

export function createDelegationTools(ctx: RuntimeContext, workspace: string): Tool[] {
  const internalSoulIds = new Set(Object.values(ctx.soulIds));
  const timeoutMs = ctx.config.delegation_timeout_ms;

  const askMentor = createAskMentorTool({
    db: ctx.db,
    soulsDb: ctx.soulsDb,
    mentorSoulId: ctx.soulIds.mentor,
    modelSmall: ctx.config.model_small,
    timeoutMs,
  });

  const delegate = createDelegateTool({
    db: ctx.db,
    soulsDb: ctx.soulsDb,
    workspace,
    model: ctx.config.model,
    internalSoulIds,
    timeoutMs,
  });

  return [askMentor, delegate];
}
