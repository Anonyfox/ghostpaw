import { getConfig } from "../core/config/api/read/index.ts";
import { crystallizationReadiness, pendingShardCount } from "../core/souls/api/read/index.ts";
import type { CrystallizationEntry } from "../core/souls/api/types.ts";
import {
  enforceShardCap,
  expireOldShards,
  fadeExhaustedShards,
} from "../core/souls/api/write/index.ts";
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
