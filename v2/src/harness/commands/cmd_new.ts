import { getSession } from "../../core/chat/api/read/index.ts";
import { closeSession, createSession } from "../../core/chat/api/write/index.ts";
import type { CommandContext, CommandResult } from "./types.ts";

export async function executeNew(ctx: CommandContext, _args: string): Promise<CommandResult> {
  if (ctx.sessionId) {
    const existing = getSession(ctx.db, ctx.sessionId);
    if (existing && !existing.closedAt) {
      closeSession(ctx.db, ctx.sessionId);
    }
  }

  const newKey = `slash:${Date.now()}`;
  const session = createSession(ctx.db, newKey, { purpose: "chat" });

  return {
    text: "New session started.",
    action: {
      type: "new_session",
      sessionId: session.id as number,
      sessionKey: newKey,
    },
  };
}
