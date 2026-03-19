import { stampAttuned } from "../core/souls/api/write/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { attunePhaseOne } from "./attune_phase_one.ts";
import { attunePhaseTwo } from "./attune_phase_two.ts";
import type { Entity } from "./types.ts";

export interface AttuneResult {
  totalPendingShards: number;
  crystallizingCount: number;
  phaseOneMs: number;
  phaseTwoRan: boolean;
  phaseTwoCostUsd?: number;
  phaseTwoSoul?: string;
}

export async function runAttune(entity: Entity, db: DatabaseHandle): Promise<AttuneResult> {
  const start = Date.now();
  const { totalPendingShards, readySouls } = attunePhaseOne(db);
  const phaseOneMs = Date.now() - start;

  let phaseTwoRan = false;
  let phaseTwoCostUsd: number | undefined;
  let phaseTwoSoul: string | undefined;

  if (readySouls.length > 0) {
    const target = readySouls[0];
    const p2 = await attunePhaseTwo(entity, db, target);
    stampAttuned(db, target.soulId);
    phaseTwoRan = true;
    phaseTwoCostUsd = p2.costUsd;
    phaseTwoSoul = p2.soulName;
  }

  return {
    totalPendingShards,
    crystallizingCount: readySouls.length,
    phaseOneMs,
    phaseTwoRan,
    phaseTwoCostUsd,
    phaseTwoSoul,
  };
}
