export interface SoulOverviewInfo {
  id: number;
  name: string;
  description: string;
  level: number;
  activeTraitCount: number;
  essencePreview: string;
  isMandatory: boolean;
  updatedAt: number;
}

export interface SoulsListResponse {
  souls: SoulOverviewInfo[];
  traitLimit: number;
}

export interface TraitInfo {
  id: number;
  principle: string;
  provenance: string;
  generation: number;
  status: string;
  mergedInto: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface LevelInfo {
  id: number;
  level: number;
  essenceBefore: string;
  essenceAfter: string;
  traitsConsolidated: number[];
  traitsPromoted: number[];
  traitsCarried: number[];
  traitsMerged: number[];
  createdAt: number;
}

export interface SoulDetailResponse {
  id: number;
  name: string;
  essence: string;
  description: string;
  level: number;
  traitLimit: number;
  isMandatory: boolean;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
  traits: TraitInfo[];
  levels: LevelInfo[];
  mentorAvailable: boolean;
}
