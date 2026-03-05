export const VALIDATION_SEVERITIES = ["error", "warning", "info"] as const;
export type ValidationSeverity = (typeof VALIDATION_SEVERITIES)[number];

export interface SkillFrontmatter {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowedTools?: string;
  disableModelInvocation?: boolean;
  raw: Record<string, string>;
}

export interface SkillFiles {
  scripts: string[];
  references: string[];
  assets: string[];
  other: string[];
}

export interface Skill {
  name: string;
  description: string;
  frontmatter: SkillFrontmatter;
  body: string;
  files: SkillFiles;
  path: string;
  skillMdPath: string;
}

export interface SkillSummary {
  name: string;
  description: string;
  rank: number;
  hasPendingChanges: boolean;
  fileCount: number;
  bodyLines: number;
}

export interface SkillIndexEntry {
  name: string;
  description: string;
}

export interface CheckpointResult {
  committed: boolean;
  skills: string[];
  message: string;
  commitHash?: string;
}

export interface SkillPendingChanges {
  name: string;
  created: string[];
  modified: string[];
  deleted: string[];
  totalChanges: number;
}

export interface PendingChangesResult {
  skills: SkillPendingChanges[];
  untracked: string[];
  totalChanges: number;
}

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  autoFixable: boolean;
}

export interface ValidationResult {
  name: string;
  path: string;
  valid: boolean;
  issues: ValidationIssue[];
}

export interface RepairAction {
  code: string;
  description: string;
  applied: boolean;
}

export interface RepairResult {
  name: string;
  actions: RepairAction[];
  remainingIssues: ValidationIssue[];
}

export interface HistoryEntry {
  hash: string;
  message: string;
}

export interface GitResult {
  stdout: string;
  ok: boolean;
}

export interface CreateSkillInput {
  name: string;
  description: string;
  body?: string;
  scripts?: boolean;
  references?: boolean;
}

export interface DefaultSkill {
  description: string;
  body: string;
}
