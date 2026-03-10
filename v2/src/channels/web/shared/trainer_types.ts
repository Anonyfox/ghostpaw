export interface TrainerOption {
  id: string;
  title: string;
  description: string;
}

export interface TrainerProposalResponse {
  options: TrainerOption[];
  rawContent: string;
  sessionId: number;
  cost: { totalUsd: number };
}

export interface TrainerExecuteResponse {
  content: string;
  succeeded: boolean;
  cost: { totalUsd: number };
  skillName?: string;
  newRank?: number;
  newTier?: string;
}

export interface TrainerStatusResponse {
  skillCount: number;
  totalRanks: number;
  pendingChanges: number;
  trainerAvailable: boolean;
  fragmentCount: number;
  proposalCount: number;
}

export interface SkillSummaryInfo {
  name: string;
  description: string;
  rank: number;
  tier: string;
  readiness: "grey" | "green" | "yellow" | "orange";
  hasPendingChanges: boolean;
  fileCount: number;
  bodyLines: number;
}

export interface SkillDetailInfo {
  name: string;
  description: string;
  body: string;
  rank: number;
  tier: string;
  readiness: "grey" | "green" | "yellow" | "orange";
  hasPendingChanges: boolean;
  files: {
    scripts: string[];
    references: string[];
    assets: string[];
    other: string[];
  };
  validation: {
    valid: boolean;
    issues: { severity: string; code: string; message: string }[];
  };
}

export interface SkillHealthInfo {
  computedAt: number;
  totalSkills: number;
  rankDistribution: Record<string, number>;
  staleSkills: string[];
  dormantSkills: string[];
  oversizedSkills: string[];
  pendingFragments: number;
  expiredFragments: number;
  repairsApplied: number;
  proposalsQueued: number;
  explored: boolean;
}

export interface SkillProposalInfo {
  id: number;
  title: string;
  rationale: string;
  fragmentIds: string;
  status: "pending" | "approved" | "dismissed";
  createdAt: number;
}
