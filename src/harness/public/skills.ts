import {
  getSkillMarkdown,
  pendingFragments,
  pendingProposals,
  type SkillProposal,
  skillRank,
  skillTier,
} from "../../core/skills/api/read/index.ts";
import {
  approveProposal,
  checkpoint,
  dismissProposal,
  repairFlatFile,
  repairSkill,
} from "../../core/skills/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import type { Entity } from "../index.ts";
import {
  buildCreateExecutePrompt,
  buildCreateProposePrompt,
  buildTrainExecutePrompt,
  buildTrainProposePrompt,
  invokeTrainerExecute,
  invokeTrainerPropose,
  parseTrainerOptions,
} from "../index.ts";

export function checkpointSkills(
  workspace: string,
  names: string[],
  message: string,
  db?: DatabaseHandle,
) {
  return checkpoint(workspace, names, message, db);
}

export function repairSkillEntry(workspace: string, name: string, flat = false) {
  return flat ? repairFlatFile(workspace, name) : repairSkill(workspace, name);
}

export async function proposeSkillTraining(
  entity: Entity,
  db: DatabaseHandle,
  workspace: string,
  skillName: string,
  model?: string,
): Promise<
  | {
      ok: true;
      sessionId: number;
      rawContent: string;
      options: ReturnType<typeof parseTrainerOptions>;
      costUsd: number;
    }
  | { ok: false; error: string }
> {
  const content = getSkillMarkdown(workspace, skillName);
  if (content == null) {
    return { ok: false, error: `Skill "${skillName}" not found.` };
  }

  const fragments = pendingFragments(db);
  const fragmentRefs =
    fragments.length > 0
      ? fragments.map((f) => ({ id: f.id, observation: f.observation }))
      : undefined;

  const prompt = buildTrainProposePrompt(skillName, content, fragmentRefs);
  const result = await invokeTrainerPropose(entity, db, prompt, { model, purpose: "train" });
  return {
    ok: true,
    sessionId: result.sessionId,
    rawContent: result.content,
    options: parseTrainerOptions(result.content),
    costUsd: result.cost.estimatedUsd,
  };
}

export async function executeSkillTraining(
  entity: Entity,
  db: DatabaseHandle,
  workspace: string,
  sessionId: number,
  skillName: string,
  rawContent: string,
  optionId: string | undefined,
  guidance: string | undefined,
  model?: string,
): Promise<{
  content: string;
  succeeded: boolean;
  costUsd: number;
  newRank?: number;
  newTier?: string;
}> {
  const options = parseTrainerOptions(rawContent);
  const selected = options.find((option) => option.id === String(optionId));
  const title = selected?.title ?? String(guidance ?? "Improve skill");
  const description = selected?.description ?? String(guidance ?? "");
  const extra = typeof guidance === "string" ? guidance : undefined;

  const fragmentIds = pendingFragments(db).map((fragment) => fragment.id);
  const prompt = buildTrainExecutePrompt(
    skillName,
    title,
    description,
    extra,
    fragmentIds.length > 0 ? fragmentIds : undefined,
  );
  const result = await invokeTrainerExecute(entity, db, sessionId, prompt, { model });

  let newRank: number | undefined;
  let newTier: string | undefined;
  try {
    newRank = skillRank(workspace, skillName);
    newTier = skillTier(newRank).tier;
  } catch {
    // non-critical rank lookup
  }

  return {
    content: result.content,
    succeeded: result.succeeded,
    costUsd: result.cost.estimatedUsd,
    newRank,
    newTier,
  };
}

export async function approveSkillProposal(
  entity: Entity,
  db: DatabaseHandle,
  proposalId: number,
): Promise<{
  proposal: SkillProposal;
  content: string;
  succeeded: boolean;
  costUsd: number;
}> {
  const proposal = pendingProposals(db).find((entry) => entry.id === proposalId);
  if (!proposal) {
    throw new Error(`Proposal ${proposalId} not found or already resolved.`);
  }

  approveProposal(db, proposalId);

  const proposePrompt = buildCreateProposePrompt(proposal.title);
  const proposeResult = await invokeTrainerPropose(entity, db, proposePrompt, {
    purpose: "create",
  });

  const executePrompt = buildCreateExecutePrompt(
    proposal.title,
    proposal.rationale,
    `Create this skill based on proposal: ${proposal.rationale}`,
  );
  const executeResult = await invokeTrainerExecute(
    entity,
    db,
    proposeResult.sessionId,
    executePrompt,
  );

  return {
    proposal,
    content: executeResult.content,
    succeeded: executeResult.succeeded,
    costUsd: proposeResult.cost.estimatedUsd + executeResult.cost.estimatedUsd,
  };
}

export function dismissSkillProposal(db: DatabaseHandle, proposalId: number): void {
  dismissProposal(db, proposalId);
}
