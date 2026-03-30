import type { RuntimeContext } from "../../runtime.ts";

export type CommandCtx = RuntimeContext & {
  sessionId: number | null;
};

export type CommandResult = {
  text: string;
  action?:
    | { type: "new_session"; sessionId: number }
    | { type: "switch_session"; sessionId: number }
    | { type: "model_changed"; model: string }
    | { type: "undo"; removedCount: number }
    | { type: "ghost_toggle" }
    | { type: "quit" };
};

export type Command = {
  name: string;
  description: string;
  args?: string;
  slash: boolean;
  cli: boolean;
  hidden?: boolean;
  execute(ctx: CommandCtx, args: string): Promise<CommandResult>;
};
