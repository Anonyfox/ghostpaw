export type ShardSource = "session" | "haunt" | "quest" | "delegation";
export type ShardStatus = "pending" | "faded";

export interface SoulShard {
  id: number;
  source: ShardSource;
  sourceId: string | null;
  observation: string;
  sealed: boolean;
  status: ShardStatus;
  createdAt: number;
  soulIds: number[];
}

export interface CrystallizationEntry {
  soulId: number;
  shardCount: number;
  sourceDiversity: number;
  ageSpread: number;
}

export interface ShardCountPerSoul {
  soulId: number;
  count: number;
  sourceCount: number;
}
