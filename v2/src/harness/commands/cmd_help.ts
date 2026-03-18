import type { CommandContext, CommandResult, SlashCommandDef } from "./types.ts";

export function executeHelp(
  commands: readonly SlashCommandDef[],
  _ctx: CommandContext,
  args: string,
): CommandResult {
  const target = args.trim().replace(/^\//, "");

  if (target) {
    const cmd = commands.find((c) => c.name === target);
    if (!cmd) {
      return { text: `Unknown command "/${target}". Type /help to see all commands.` };
    }
    const usage = cmd.args ? `/${cmd.name} ${cmd.args}` : `/${cmd.name}`;
    return { text: `${usage}\n${cmd.description}` };
  }

  const lines = commands.map((c) => {
    const usage = c.args ? `/${c.name} ${c.args}` : `/${c.name}`;
    return `${usage} — ${c.description}`;
  });
  return { text: `Available commands:\n${lines.join("\n")}` };
}
