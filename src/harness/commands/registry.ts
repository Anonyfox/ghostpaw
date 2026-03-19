import { executeCosts } from "./cmd_costs.ts";
import { executeHelp } from "./cmd_help.ts";
import { executeModel } from "./cmd_model.ts";
import { executeNew } from "./cmd_new.ts";
import { executeUndo } from "./cmd_undo.ts";
import type { CommandContext, CommandResult, SlashCommandDef } from "./types.ts";

export const COMMANDS: readonly SlashCommandDef[] = [
  {
    name: "help",
    description: "List available commands or show details for one",
    args: "[command]",
    execute: (ctx, args) => Promise.resolve(executeHelp(COMMANDS, ctx, args)),
  },
  {
    name: "new",
    description: "Start a fresh chat session",
    execute: executeNew,
  },
  {
    name: "undo",
    description: "Remove the last message exchange",
    execute: executeUndo,
  },
  {
    name: "model",
    description: "List available models or switch to a different one",
    args: "[name]",
    execute: executeModel,
  },
  {
    name: "costs",
    description: "Show cost breakdown (today / week / total)",
    execute: executeCosts,
  },
];

const COMMAND_NAMES = new Set(COMMANDS.map((c) => c.name));

export function parseSlashCommand(input: string): { name: string; args: string } | null {
  if (!input.startsWith("/")) return null;
  const trimmed = input.slice(1);
  const spaceIdx = trimmed.indexOf(" ");
  const name = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
  if (!COMMAND_NAMES.has(name)) return null;
  const args = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1);
  return { name, args };
}

export async function executeCommand(
  name: string,
  args: string,
  ctx: CommandContext,
): Promise<CommandResult> {
  const cmd = COMMANDS.find((c) => c.name === name);
  if (!cmd) {
    return { text: `Unknown command "/${name}". Type /help to see all commands.` };
  }
  return cmd.execute(ctx, args);
}

export function formatHelpText(commandName?: string): string {
  if (commandName) {
    const cmd = COMMANDS.find((c) => c.name === commandName);
    if (!cmd) return `Unknown command "/${commandName}".`;
    const usage = cmd.args ? `/${cmd.name} ${cmd.args}` : `/${cmd.name}`;
    return `${usage}\n${cmd.description}`;
  }
  return COMMANDS.map((c) => {
    const usage = c.args ? `/${c.name} ${c.args}` : `/${c.name}`;
    return `${usage} — ${c.description}`;
  }).join("\n");
}
