import type { CrystallizationEntry } from "../core/souls/index.ts";
import { formatSoulEvidence, gatherSoulEvidence, getSoul } from "../core/souls/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { createProposeTraitTool } from "../tools/mentor/propose_trait.ts";
import { createRevertTraitTool } from "../tools/mentor/revert_trait.ts";
import { createReviseTraitTool } from "../tools/mentor/revise_trait.ts";
import { invokeMentor } from "./invoke_mentor.ts";
import { buildAttunePrompt } from "./mentor_attune_prompt.ts";
import type { Entity } from "./types.ts";

export async function attunePhaseTwo(
  entity: Entity,
  db: DatabaseHandle,
  target: CrystallizationEntry,
): Promise<{ costUsd: number; soulName: string }> {
  const soul = getSoul(db, target.soulId);
  if (!soul) throw new Error(`Soul ${target.soulId} not found`);

  const evidence = gatherSoulEvidence(db, soul.name);
  const formatted = formatSoulEvidence(evidence);
  const prompt = buildAttunePrompt(soul.name, formatted);

  const attuneTools = [
    createProposeTraitTool(db),
    createReviseTraitTool(db),
    createRevertTraitTool(db),
  ];

  const result = await invokeMentor(entity, db, prompt, { tools: attuneTools });
  return { costUsd: result.cost.estimatedUsd, soulName: soul.name };
}
