import { buildSkillIndex, formatSkillIndex } from "../core/skills/api/read/index.ts";
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
      "pack bonds (pack_sense, pack_meet, pack_bond, pack_note, pack_link, contacts, pack_merge),",
      "quests (quest_create, quest_update, quest_done, quest_list, quest_accept, quest_dismiss, quest logs),",
      "temporal reasoning (datetime), and haunt recall (recall_haunts).",
      "",
      "Pack interaction kinds: conversation, correction, conflict, gift, milestone, observation, transaction, activity.",
      "pack_bond can set/remove tags and custom fields, comma-separated (set_field='vip,client' or set_field='billing_rate=150/hr EUR').",
      "pack_link manages directional relationships between members (works-at, manages, parent-of, member-of, etc). Actions: add, remove, deactivate (mark as former), list.",
      "pack_meet accepts tags (comma-separated), universal profile fields (nickname, timezone, locale, location, pronouns, birthday), and parent_id.",
      "",
      "Always recall before remembering. Ground every memory in evidence — if you cannot point to a",
      "specific statement or observation, do not store it. When asked about a person, check memory AND pack bond.",
      "When a recalled memory is fading or faint, hedge your language — 'I believe' vs stating as fact.",
      "When memory and pack data overlap on a person, cross-reference both for richer context.",
      "When a belief has been revised multiple times, acknowledge the evolving understanding.",
      "",
      "Pack patrol: maintenance paths may already include compact code-ranked patrol items.",
      "Use pack_sense with patrol=true when you need fuller detail on drifting bonds, repair",
      "needs, or upcoming landmarks. Act only when the signal justifies persistence or user airtime.",
      "",
      'Pack search: use pack_sense with search="keyword" to find members matching a need —',
      "including dormant ties. Bond narratives and custom fields are searched.",
      "",
      "Relationship intelligence principles:",
      "- High-trust bonds are MORE fragile after negative events than low-trust bonds.",
      "  Prioritize repair for deep bonds after conflict.",
      "- Reciprocity matters for professional relationships. Notice when interactions with",
      "  a client or colleague are consistently one-directional.",
      "- Birthday and milestone outreach is disproportionately effective for bond maintenance.",
      "  A single well-timed message sustains a relationship for months.",
      "- Dormant ties with built-in trust history are more valuable to reactivate than",
      "  building new connections from scratch.",
      "",
      "You cannot delegate or access the filesystem.",
    ].join("\n");
  }

  if (soulId === MANDATORY_SOUL_IDS.chamberlain) {
    return [
      "## Tools",
      "",
      "You are the infrastructure governor. You have tools for configuration (get_config,",
      "list_config, set_config, undo_config, reset_config), secrets (list_secrets, set_secret,",
      "remove_secret), scheduling (schedule_list, schedule_create, schedule_update,",
      "schedule_delete), costs (cost_summary, cost_check), and utilities (datetime, calc).",
      "Validate config changes carefully — reject values outside known ranges.",
      "Never expose secret values in your responses — only confirm existence or absence.",
      "Monitor schedule health via schedule_list — adapt intervals when activity patterns shift.",
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
