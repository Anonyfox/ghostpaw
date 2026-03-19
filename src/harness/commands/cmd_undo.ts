import { deleteLastExchange } from "../../core/chat/api/write/index.ts";
import type { CommandContext, CommandResult } from "./types.ts";

export async function executeUndo(ctx: CommandContext, _args: string): Promise<CommandResult> {
  const result = deleteLastExchange(ctx.db, ctx.sessionId);

  if (result.removedCount === 0) {
    return { text: "Nothing to undo." };
  }

  return {
    text: `Removed last exchange (${result.removedCount} messages).`,
    action: {
      type: "undo",
      removedCount: result.removedCount,
      removedMessageIds: result.removedMessageIds,
    },
  };
}
