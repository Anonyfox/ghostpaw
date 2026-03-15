import {
  buildSkillIndex,
  formatSkillIndex,
  listSkills,
  pendingFragmentCount,
  pendingFragments,
  pendingProposals,
  readinessForAll,
  type SkillHealthData,
  skillTier,
  validateAllSkills,
} from "../core/skills/api/read/index.ts";
import {
  enforceFragmentCap as enforceFragmentCapWrite,
  expireStaleFragments as expireStaleFragmentsWrite,
  repairFlatFile as repairFlatFileWrite,
  repairSkill as repairSkillWrite,
  writeSkillHealth as writeSkillHealthWrite,
} from "../core/skills/api/write/index.ts";
import { listSkillOpportunitySignals } from "../core/trail/api/read/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { createRecallTool } from "../tools/memory/recall.ts";
import { createStokeTools } from "../tools/trainer/index.ts";
import { invokeTrainer } from "./invoke_trainer.ts";
import { buildStokePrompt } from "./trainer_stoke_prompt.ts";
import type { Entity } from "./types.ts";

export interface StokeResult {
  health: SkillHealthData;
  phaseOneMs: number;
  phaseTwoRan: boolean;
  phaseTwoCostUsd?: number;
}

export function stokePhaseOne(workspace: string, db: DatabaseHandle): SkillHealthData {
  const validations = validateAllSkills(workspace);
  let repairsApplied = 0;
  for (const v of validations) {
    if (!v.valid && v.issues.some((i) => i.autoFixable)) {
      if (v.issues.some((i) => i.code === "flat-file")) {
        repairFlatFileWrite(workspace, v.name);
      } else {
        repairSkillWrite(workspace, v.name);
      }
      repairsApplied++;
    }
  }

  expireStaleFragmentsWrite(db, 90);
  const expiredCount = 0;
  enforceFragmentCapWrite(db, 50);

  const skills = listSkills(workspace, db);
  const names = skills.map((s) => s.name);
  const readinessMap = readinessForAll(db, names);

  const now = Math.floor(Date.now() / 1000);
  const staleSkills: string[] = [];
  const dormantSkills: string[] = [];
  const oversizedSkills: string[] = [];
  const rankDist: Record<string, number> = {};

  for (const s of skills) {
    const { tier } = skillTier(s.rank);
    rankDist[tier] = (rankDist[tier] ?? 0) + 1;

    if (s.bodyLines > 400) oversizedSkills.push(s.name);

    const r = readinessMap[s.name];
    if (r?.color === "orange") staleSkills.push(s.name);
    else if (r && r.readsSinceCheckpoint === 0 && s.rank >= 1) dormantSkills.push(s.name);
  }

  const pending = pendingFragmentCount(db);

  const health: SkillHealthData = {
    computedAt: now,
    totalSkills: skills.length,
    rankDistribution: rankDist,
    staleSkills,
    dormantSkills,
    oversizedSkills,
    pendingFragments: pending,
    expiredFragments: expiredCount,
    repairsApplied,
    proposalsQueued: 0,
    explored: false,
  };

  writeSkillHealthWrite(db, health);
  return health;
}

export function stokePhaseTwoNeeded(db: DatabaseHandle): boolean {
  const fragCount = pendingFragmentCount(db);
  if (fragCount < 5) return false;

  const lastExplored = db
    .prepare("SELECT computed_at FROM skill_health WHERE explored = 1 ORDER BY rowid DESC LIMIT 1")
    .get() as { computed_at: number } | undefined;

  if (!lastExplored) return true;

  const newSince = (
    db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM skill_fragments
       WHERE status = 'pending' AND created_at > ?`,
      )
      .get(lastExplored.computed_at) as { cnt: number }
  ).cnt;

  return newSince >= 3;
}

export async function stokePhaseTwo(
  entity: Entity,
  db: DatabaseHandle,
  workspace: string,
): Promise<{ costUsd: number }> {
  const frags = pendingFragments(db);
  const fragSummary = frags
    .map((f) => `[id=${f.id}] ${f.observation}${f.domain ? ` (domain: ${f.domain})` : ""}`)
    .join("\n");

  const index = formatSkillIndex(buildSkillIndex(workspace));
  let trailSignals: string | undefined;
  try {
    const signals = listSkillOpportunitySignals(db, 5);
    if (signals.length > 0) {
      trailSignals = signals
        .map((s) => `- [${s.source}] ${s.description} (significance: ${s.significance.toFixed(2)})`)
        .join("\n");
    }
  } catch {
    /* fail-open: trail tables may not exist yet */
  }
  const prompt = buildStokePrompt(fragSummary, index, trailSignals);

  const stokeTools = [...createStokeTools(db), createRecallTool(db)];
  const result = await invokeTrainer(entity, db, prompt, {
    purpose: "stoke",
    tools: stokeTools,
  });

  return { costUsd: result.cost.estimatedUsd };
}

export async function runStoke(
  entity: Entity,
  db: DatabaseHandle,
  workspace: string,
  options?: { skipPhaseTwo?: boolean },
): Promise<StokeResult> {
  const start = Date.now();
  const health = stokePhaseOne(workspace, db);
  const phaseOneMs = Date.now() - start;

  let phaseTwoRan = false;
  let phaseTwoCostUsd: number | undefined;

  if (!options?.skipPhaseTwo && stokePhaseTwoNeeded(db)) {
    const p2 = await stokePhaseTwo(entity, db, workspace);
    phaseTwoRan = true;
    phaseTwoCostUsd = p2.costUsd;
    health.explored = true;
    health.proposalsQueued = pendingProposals(db).length;
    writeSkillHealthWrite(db, health);
  }

  return { health, phaseOneMs, phaseTwoRan, phaseTwoCostUsd };
}
