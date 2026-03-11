import { resolve } from "node:path";
import { getSkillMarkdown, listSkills } from "../../core/skills/api/read/index.ts";
import { createEntity, parseTrainerOptions } from "../../harness/index.ts";
import { proposeSkillTraining } from "../../harness/public/skills.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

export interface HandleTrainDeps {
  db: DatabaseHandle;
  isAllowed: (chatId: number) => boolean;
  sendMessage: (chatId: number, text: string) => Promise<void>;
}

export async function handleTrain(
  deps: HandleTrainDeps,
  chatId: number,
  skillName?: string,
): Promise<void> {
  if (!deps.isAllowed(chatId)) return;

  const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");

  if (!skillName?.trim()) {
    const skills = listSkills(workspace, deps.db);
    if (skills.length === 0) {
      await deps.sendMessage(chatId, "No skills available for training.");
      return;
    }
    const readySkills = skills.filter((s) => s.readiness === "orange" || s.readiness === "yellow");
    if (readySkills.length > 0) {
      const names = readySkills.map((s) => `• ${s.name} (${s.readiness})`).join("\n");
      await deps.sendMessage(
        chatId,
        `*Skills ready for training:*\n${names}\n\nUse /train <name> to start.`,
      );
    } else {
      const names = skills.map((s) => `• ${s.name}`).join("\n");
      await deps.sendMessage(
        chatId,
        `*Available skills:*\n${names}\n\nUse /train <name> to start.`,
      );
    }
    return;
  }

  const name = skillName.trim();
  if (getSkillMarkdown(workspace, name) == null) {
    await deps.sendMessage(chatId, `Skill "${name}" not found.`);
    return;
  }

  await deps.sendMessage(chatId, `Analyzing ${name}...`);

  try {
    const entity = createEntity({ db: deps.db, workspace });
    const result = await proposeSkillTraining(entity, deps.db, workspace, name);
    if (!result.ok) {
      await deps.sendMessage(chatId, result.error);
      return;
    }
    const options =
      result.options.length > 0 ? result.options : parseTrainerOptions(result.rawContent);

    if (options.length === 0) {
      await deps.sendMessage(chatId, "No improvements identified.");
      return;
    }

    const formatted = options
      .map((o, i) => `*${i + 1}. ${o.title}*\n${o.description}`)
      .join("\n\n");
    await deps.sendMessage(
      chatId,
      `*Training proposals for ${name}:*\n\n${formatted}\n\nCost: $${result.costUsd.toFixed(4)}`,
    );
  } catch (err) {
    await deps.sendMessage(
      chatId,
      `Training analysis failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
