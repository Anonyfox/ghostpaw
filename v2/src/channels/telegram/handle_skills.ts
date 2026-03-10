import { resolve } from "node:path";
import { listSkills } from "../../core/skills/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

export interface HandleSkillsDeps {
  db: DatabaseHandle;
  isAllowed: (chatId: number) => boolean;
  sendMessage: (chatId: number, text: string) => Promise<void>;
}

const READINESS_EMOJI: Record<string, string> = {
  grey: "⚪",
  green: "🟢",
  yellow: "🟡",
  orange: "🟠",
};

export async function handleSkills(deps: HandleSkillsDeps, chatId: number): Promise<void> {
  if (!deps.isAllowed(chatId)) return;

  const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
  const skills = listSkills(workspace, deps.db);

  if (skills.length === 0) {
    await deps.sendMessage(chatId, "No skills found.");
    return;
  }

  const lines = skills.map((s) => {
    const dot = READINESS_EMOJI[s.readiness] ?? READINESS_EMOJI.grey;
    return `${dot} *${s.name}* — ${s.tier} (${s.rank})\n  ${s.description}`;
  });

  const header = `*Skills* (${skills.length})\n\n`;
  await deps.sendMessage(chatId, header + lines.join("\n\n"));
}
