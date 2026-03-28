import type { Command, CommandCtx, CommandResult } from "./types.ts";

export interface CommandRegistry {
  register(cmd: Command): void;
  parseSlash(input: string): { name: string; args: string } | null;
  execute(name: string, args: string, ctx: CommandCtx): Promise<CommandResult>;
  listSlash(): Command[];
  listCli(): Command[];
  get(name: string): Command | undefined;
}

export function createRegistry(): CommandRegistry {
  const commands = new Map<string, Command>();

  return {
    register(cmd: Command): void {
      commands.set(cmd.name, cmd);
    },

    parseSlash(input: string): { name: string; args: string } | null {
      const trimmed = input.trim();
      if (!trimmed.startsWith("/")) return null;
      const spaceIdx = trimmed.indexOf(" ");
      if (spaceIdx === -1) {
        return { name: trimmed.slice(1), args: "" };
      }
      return { name: trimmed.slice(1, spaceIdx), args: trimmed.slice(spaceIdx + 1).trim() };
    },

    async execute(name: string, args: string, ctx: CommandCtx): Promise<CommandResult> {
      const cmd = commands.get(name);
      if (!cmd) {
        return { text: `Unknown command: ${name}. Type /help for available commands.` };
      }
      return cmd.execute(ctx, args);
    },

    listSlash(): Command[] {
      return [...commands.values()].filter((c) => c.slash && !c.hidden);
    },

    listCli(): Command[] {
      return [...commands.values()].filter((c) => c.cli && !c.hidden);
    },

    get(name: string): Command | undefined {
      return commands.get(name);
    },
  };
}
