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
}

export interface TrainerStatusResponse {
  skillCount: number;
  totalRanks: number;
  pendingChanges: number;
  trainerAvailable: boolean;
}

export interface SkillSummaryInfo {
  name: string;
  description: string;
  rank: number;
  hasPendingChanges: boolean;
  fileCount: number;
  bodyLines: number;
}

export interface SkillDetailInfo {
  name: string;
  description: string;
  body: string;
  rank: number;
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
