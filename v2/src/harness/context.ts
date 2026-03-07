import { buildSkillIndex, formatSkillIndex } from "../core/skills/index.ts";
import { MANDATORY_SOUL_IDS, renderSoul } from "../core/souls/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";

export interface AssembleContextOptions {
  soulId?: number;
}

export function assembleContext(
  db: DatabaseHandle,
  workspace: string,
  soulIdOrOptions?: number | AssembleContextOptions,
): string {
  const opts: AssembleContextOptions =
    typeof soulIdOrOptions === "number" ? { soulId: soulIdOrOptions } : (soulIdOrOptions ?? {});

  const effectiveSoulId = opts.soulId ?? MANDATORY_SOUL_IDS.ghostpaw;
  const soul = renderSoul(db, effectiveSoulId);
  if (!soul) {
    throw new Error(`Soul ${effectiveSoulId} not found. Run bootstrap before creating the entity.`);
  }

  if (
    effectiveSoulId === MANDATORY_SOUL_IDS.warden ||
    effectiveSoulId === MANDATORY_SOUL_IDS.chamberlain
  ) {
    return [soul, formatEnvironment(), formatToolGuidance(effectiveSoulId)].join("\n\n");
  }

  const sections: string[] = [soul];
  sections.push(formatEnvironment());

  const skillEntries = buildSkillIndex(workspace);
  if (skillEntries.length > 0) {
    sections.push(formatSkillIndex(skillEntries));
  }

  sections.push(formatToolGuidance(effectiveSoulId));
  return sections.join("\n\n");
}

function formatEnvironment(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `## Environment\n\nCurrent date: ${dateStr}`;
}

function formatToolGuidance(soulId: number): string {
  if (soulId === MANDATORY_SOUL_IDS.warden) {
    return [
      "## Tools",
      "",
      "You are the persistence keeper. You have tools for memory (recall, remember, revise, forget),",
      "pack bonds (pack_sense, pack_meet, pack_bond, pack_note, contacts, pack_merge),",
      "quests (quest_create, quest_update, quest_done, quest_list, quest_accept, quest_dismiss, quest logs),",
      "temporal reasoning (datetime), and haunt recall (recall_haunts).",
      "Always recall before remembering. When asked about a person, check memory AND pack bond.",
      "You cannot delegate or access the filesystem.",
    ].join("\n");
  }

  if (soulId === MANDATORY_SOUL_IDS.chamberlain) {
    return [
      "## Tools",
      "",
      "You are the infrastructure governor. You have tools for configuration (get_config,",
      "list_config, set_config, undo_config, reset_config), secrets (list_secrets, set_secret,",
      "remove_secret), and utilities (datetime, calc).",
      "Validate config changes carefully — reject values outside known ranges.",
      "Never expose secret values in your responses — only confirm existence or absence.",
      "You cannot delegate or access the filesystem.",
    ].join("\n");
  }

  const base = [
    "## Tools",
    "",
    "You have tools for filesystem, web, and extensions.",
    "For persistence operations (memory, pack, quests), delegate to the Warden.",
    "For infrastructure (config, secrets, budget), delegate to the Chamberlain.",
    "For soul development, delegate to the Mentor.",
    "For skill development, delegate to the Trainer.",
  ];

  if (soulId === MANDATORY_SOUL_IDS.mentor) {
    base.push(
      "",
      "You have specialist tools for soul development: review_soul, propose_trait, " +
        "revise_trait, revert_trait, reactivate_trait, execute_level_up, revert_level_up. " +
        "These are exclusive to you — other agents delegate soul work to you.",
    );
  } else if (soulId === MANDATORY_SOUL_IDS.trainer) {
    base.push(
      "",
      "You have specialist tools for skill development: review_skills, create_skill, " +
        "checkpoint_skills, skill_diff, skill_history, rollback_skill, validate_skills. " +
        "These are exclusive to you — other agents delegate skill work to you.",
    );
  }

  return base.join("\n");
}
