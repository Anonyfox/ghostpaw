import type { Omen } from "./types.ts";

export interface GatherSlices {
  memory: unknown[] | null;
  costs: unknown | null;
  chat: unknown[] | null;
  pack: unknown[] | null;
  quests: unknown[] | null;
  skills: unknown[] | null;
  souls: { traits: unknown[]; levels: unknown[] } | null;
}

export interface OmenEvidence {
  omen: Omen;
  evidence: string;
}

export interface SurpriseScore {
  domain: string;
  metric: string;
  expected: number;
  actual: number;
  divergence: number;
}

export interface SurpriseResult {
  scores: SurpriseScore[];
  omensForResolution: OmenEvidence[];
}
