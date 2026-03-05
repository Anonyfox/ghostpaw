export type TrustLevel = "deep" | "solid" | "growing" | "shallow";

export interface PackMemberInfo {
  id: number;
  name: string;
  kind: string;
  trust: number;
  trustLevel: TrustLevel;
  status: string;
  bondExcerpt: string;
  lastContact: number;
  interactionCount: number;
}

export interface PackInteractionInfo {
  id: number;
  kind: string;
  summary: string;
  significance: number;
  createdAt: number;
}

export interface PackMemberDetailResponse {
  id: number;
  name: string;
  kind: string;
  bond: string;
  trust: number;
  trustLevel: TrustLevel;
  status: string;
  firstContact: number;
  lastContact: number;
  metadata: string;
  createdAt: number;
  updatedAt: number;
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
