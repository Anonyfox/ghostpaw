export interface TrailChapterInfo {
  id: number;
  label: string;
  description: string | null;
  startedAt: number;
  endedAt: number | null;
  momentum: string;
  confidence: number;
}

export interface TrailmarkInfo {
  id: number;
  kind: string;
  description: string;
  significance: number;
  createdAt: number;
}

export interface TrailStateResponse {
  chapter: TrailChapterInfo | null;
  momentum: string;
  recentTrailmarks: TrailmarkInfo[];
  preamble: string | null;
  topLoops: OpenLoopInfo[];
}

export interface ChronicleEntryInfo {
  id: number;
  date: string;
  title: string;
  chapterId: number | null;
  narrative: string;
  highlights: string | null;
  surprises: string | null;
  unresolved: string | null;
  createdAt: number;
}

export interface ChronicleListResponse {
  entries: ChronicleEntryInfo[];
}

export interface WisdomEntryInfo {
  id: number;
  category: string;
  pattern: string;
  guidance: string;
  evidenceCount: number;
  confidence: number;
  hitCount: number;
  updatedAt: number;
}

export interface WisdomListResponse {
  entries: WisdomEntryInfo[];
}

export interface OpenLoopInfo {
  id: number;
  description: string;
  significance: number;
  status: string;
  recommendedAction: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface LoopsListResponse {
  loops: OpenLoopInfo[];
}

export interface OmenInfo {
  id: number;
  forecast: string;
  confidence: number;
  horizon: number | null;
  resolvedAt: number | null;
  outcome: string | null;
  predictionError: number | null;
  createdAt: number;
}

export interface OmensListResponse {
  omens: OmenInfo[];
}

export interface CalibrationEntryInfo {
  id: number;
  key: string;
  value: number;
  domain: string | null;
  evidenceCount: number;
  trajectory: string;
  updatedAt: number;
}

export interface CalibrationListResponse {
  entries: CalibrationEntryInfo[];
}
