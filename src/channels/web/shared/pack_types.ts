import type { ContactType } from "../../../core/pack/api/types.ts";

export type TrustLevel = "deep" | "solid" | "growing" | "shallow";

export interface PackMemberInfo {
  id: number;
  name: string;
  nickname: string | null;
  kind: string;
  trust: number;
  trustLevel: TrustLevel;
  status: string;
  bondExcerpt: string;
  lastContact: number;
  interactionCount: number;
  tags: string[];
}

export interface PackContactInfo {
  id: number;
  type: ContactType;
  value: string;
  label: string | null;
}

export interface PackFieldInfo {
  key: string;
  value: string | null;
}

export interface PackLinkInfo {
  id: number;
  targetId: number;
  targetName: string;
  label: string;
  role: string | null;
  active: boolean;
}

export interface PackInteractionInfo {
  id: number;
  kind: string;
  summary: string;
  significance: number;
  occurredAt: number | null;
  createdAt: number;
}

export interface PackMemberDetailResponse {
  id: number;
  name: string;
  nickname: string | null;
  kind: string;
  bond: string;
  trust: number;
  trustLevel: TrustLevel;
  status: string;
  isUser: boolean;
  parentId: number | null;
  parentName: string | null;
  timezone: string | null;
  locale: string | null;
  location: string | null;
  address: string | null;
  pronouns: string | null;
  birthday: string | null;
  firstContact: number;
  lastContact: number;
  createdAt: number;
  updatedAt: number;
  fields: PackFieldInfo[];
  links: PackLinkInfo[];
  contacts: PackContactInfo[];
  interactions: PackInteractionInfo[];
}

export interface PackListResponse {
  members: PackMemberInfo[];
  counts: { active: number; dormant: number; lost: number; total: number };
}

export interface PackStatsResponse {
  active: number;
  dormant: number;
  lost: number;
  total: number;
}

export interface PackDriftInfo {
  memberId: number;
  name: string;
  trust: number;
  tier: "deep" | "solid" | "growing";
  daysSilent: number;
  thresholdDays: number;
  source: "fallback" | "cadence";
  baselineDays?: number;
}

export interface PackLandmarkInfo {
  type: "birthday" | "anniversary";
  memberId: number;
  name: string;
  date: string;
  daysAway: number;
  yearsAgo?: number;
  summary?: string;
}

export interface PackPatrolItemInfo {
  kind: "repair" | "reconnect" | "landmark";
  memberId: number;
  name: string;
  summary: string;
}

export interface PackPatrolResponse {
  drift: PackDriftInfo[];
  landmarks: PackLandmarkInfo[];
  patrol: PackPatrolItemInfo[];
  stats: {
    activeMembers: number;
    dormantMembers: number;
    recentInteractions: number;
    averageTrust: number;
  };
  generatedAt: number;
}

export interface PackMergePreviewChoice {
  field: string;
  keepValue: string | number | null;
  mergeValue: string | number | null;
  chosenValue: string | number | null;
  chosenSource: "keep" | "merge" | "same";
}

export interface PackMergePreviewFieldConflict {
  key: string;
  keepValue: string | null;
  mergeValue: string | null;
  chosenValue: string | null;
  chosenSource: "keep" | "merge" | "same";
}

export interface PackMergePreviewContact {
  type: string;
  value: string;
  keepLabel: string | null;
  mergeLabel: string | null;
}

export interface PackMergePreviewLinkConflict {
  direction: "outgoing" | "incoming";
  memberId: number;
  memberName: string;
  targetId: number;
  targetName: string;
  label: string;
  resolution: "keep" | "delete-self";
}

export interface PackMergePreviewResponse {
  keepMember: PackMemberInfo;
  mergeMember: PackMemberInfo;
  memberChoices: PackMergePreviewChoice[];
  overlappingContacts: PackMergePreviewContact[];
  fieldConflicts: PackMergePreviewFieldConflict[];
  linkConflicts: PackMergePreviewLinkConflict[];
  interactions: {
    keepCount: number;
    mergeCount: number;
    combinedCount: number;
    earliestAt: number | null;
    latestAt: number | null;
  };
}

export interface PackCommandResponse {
  response: string;
  cost: number;
  sessionId: number;
  acted: boolean;
}

export function trustLevel(trust: number): TrustLevel {
  if (trust >= 0.8) return "deep";
  if (trust >= 0.6) return "solid";
  if (trust >= 0.3) return "growing";
  return "shallow";
}

export function bondExcerpt(bond: string, maxLen = 120): string {
  if (bond.length <= maxLen) return bond;
  return `${bond.slice(0, maxLen)}...`;
}
