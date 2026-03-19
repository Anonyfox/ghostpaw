import type { DatabaseHandle } from "../../lib/index.ts";

export interface CommandContext {
  db: DatabaseHandle;
  sessionId: number;
  sessionKey: string;
  configuredKeys: Set<string>;
}

export type CommandAction =
  | { type: "new_session"; sessionId: number; sessionKey: string }
  | { type: "undo"; removedCount: number; removedMessageIds: number[] }
  | { type: "model_changed"; model: string };

export interface CommandResult {
  text: string;
  action?: CommandAction;
}

export interface SlashCommandDef {
  name: string;
  description: string;
  args?: string;
  execute: (ctx: CommandContext, args: string) => Promise<CommandResult>;
}
