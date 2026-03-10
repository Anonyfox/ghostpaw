import { getConfig } from "../core/config/index.ts";
import type { CrystallizationEntry } from "../core/souls/index.ts";
import {
  crystallizationReadiness,
  enforceShardCap,
  expireOldShards,
  fadeExhaustedShards,
  pendingShardCount,
} from "../core/souls/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";

export function attunePhaseOne(db: DatabaseHandle): {
  totalPendingShards: number;
  readySouls: CrystallizationEntry[];
} {
  expireOldShards(db, 120);
  enforceShardCap(db, 75);
  fadeExhaustedShards(db);

  const threshold = getConfig(db, "soul_shard_crystallization_threshold") as number;
  return {
    totalPendingShards: pendingShardCount(db),
    readySouls: crystallizationReadiness(db, threshold),
  };
}
