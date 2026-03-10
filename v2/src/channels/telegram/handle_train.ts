import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { listSkills, pendingFragments } from "../../core/skills/index.ts";
import {
  buildTrainProposePrompt,
  createEntity,
  invokeTrainerPropose,
  parseTrainerOptions,
} from "../../harness/index.ts";
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
  let content: string;
  try {
    content = readFileSync(join(workspace, "skills", name, "SKILL.md"), "utf-8");
  } catch {
    await deps.sendMessage(chatId, `Skill "${name}" not found.`);
    return;
  }

  await deps.sendMessage(chatId, `Analyzing ${name}...`);

  try {
    const entity = createEntity({ db: deps.db, workspace });
    const frags = pendingFragments(deps.db);
    const fragTexts = frags.length > 0 ? frags.map((f) => f.observation) : undefined;
    const prompt = buildTrainProposePrompt(name, content, fragTexts);
    const result = await invokeTrainerPropose(entity, deps.db, prompt, { purpose: "train" });
    const options = parseTrainerOptions(result.content);

    if (options.length === 0) {
      await deps.sendMessage(chatId, "No improvements identified.");
      return;
    }

    const formatted = options
      .map((o, i) => `*${i + 1}. ${o.title}*\n${o.description}`)
      .join("\n\n");
    await deps.sendMessage(
      chatId,
      `*Training proposals for ${name}:*\n\n${formatted}\n\nCost: $${result.cost.estimatedUsd.toFixed(4)}`,
    );
  } catch (err) {
    await deps.sendMessage(
      chatId,
      `Training analysis failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
