export const TRAIT_STATUSES = ["active", "consolidated", "promoted", "reverted"] as const;
export type TraitStatus = (typeof TRAIT_STATUSES)[number];

export interface Soul {
  id: number;
  slug: string | null;
  name: string;
  essence: string;
  description: string;
  level: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  lastAttunedAt: number | null;
}

export interface SoulSummary {
  id: number;
  name: string;
  description: string;
  level: number;
  activeTraitCount: number;
  updatedAt: number;
}

export interface SoulTrait {
  id: number;
  soulId: number;
  principle: string;
  provenance: string;
  generation: number;
  status: TraitStatus;
  mergedInto: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface SoulLevel {
  id: number;
  soulId: number;
  level: number;
  essenceBefore: string;
  essenceAfter: string;
  traitsConsolidated: number[];
  traitsPromoted: number[];
  traitsCarried: number[];
  traitsMerged: number[];
  createdAt: number;
}

export interface CreateSoulInput {
  name: string;
  essence: string;
  description?: string;
}

export interface UpdateSoulInput {
  name?: string;
  essence?: string;
  description?: string;
}

export interface AddTraitInput {
  principle: string;
  provenance: string;
}

export interface ReviseTraitInput {
  principle?: string;
  provenance?: string;
}

export interface ListTraitsOptions {
  status?: TraitStatus;
  generation?: number;
}

export interface ConsolidationGroup {
  sourceTraitIds: number[];
  mergedPrinciple: string;
  mergedProvenance: string;
}

export interface LevelUpPlan {
  newEssence: string;
  consolidations: ConsolidationGroup[];
  promotedTraitIds: number[];
  carriedTraitIds: number[];
}
