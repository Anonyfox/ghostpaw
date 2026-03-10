import { resolve } from "node:path";
import {
  fragmentCountsBySource,
  listSkills,
  pendingFragmentCount,
} from "../../core/skills/index.ts";
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

  let msg = `*Skills* (${skills.length})\n\n${lines.join("\n\n")}`;

  const fragTotal = pendingFragmentCount(deps.db);
  if (fragTotal > 0) {
    const counts = fragmentCountsBySource(deps.db);
    const srcLines = Object.entries(counts)
      .filter(([, c]) => c.pending > 0)
      .map(([src, c]) => `❔ ${c.pending} from ${src}`);
    msg += `\n\n*Fragments* (${fragTotal} pending)\n${srcLines.join("\n")}`;
  }

  await deps.sendMessage(chatId, msg);
}
