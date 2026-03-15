export const WISDOM_CATEGORIES = [
  "tone",
  "framing",
  "timing",
  "initiative",
  "workflow",
  "boundaries",
  "operational",
  "other",
] as const;
export type WisdomCategory = (typeof WISDOM_CATEGORIES)[number];

export const MOMENTUM_VALUES = ["rising", "stable", "declining", "shifting"] as const;
export type Momentum = (typeof MOMENTUM_VALUES)[number];

export const TRAILMARK_KINDS = ["turning_point", "milestone", "shift", "first"] as const;
export type TrailmarkKind = (typeof TRAILMARK_KINDS)[number];

export const LOOP_STATUSES = ["alive", "dormant", "resolved", "dismissed"] as const;
export type LoopStatus = (typeof LOOP_STATUSES)[number];

export const LOOP_ACTIONS = ["ask", "revisit", "remind", "wait", "leave"] as const;
export type LoopAction = (typeof LOOP_ACTIONS)[number];

export const LOOP_CATEGORIES = ["organic", "curiosity"] as const;
export type LoopCategory = (typeof LOOP_CATEGORIES)[number];

export const CALIBRATION_TRAJECTORIES = ["rising", "stable", "falling"] as const;
export type CalibrationTrajectory = (typeof CALIBRATION_TRAJECTORIES)[number];

export interface TrailChronicle {
  id: number;
  date: string;
  title: string;
  chapterId: number | null;
  narrative: string;
  highlights: string | null;
  surprises: string | null;
  unresolved: string | null;
  sourceSlices: string | null;
  createdAt: number;
}

export interface TrailChapter {
  id: number;
  label: string;
  description: string | null;
  startedAt: number;
  endedAt: number | null;
  momentum: Momentum;
  confidence: number;
  createdAt: number;
  updatedAt: number;
}

export interface Trailmark {
  id: number;
  chronicleId: number | null;
  chapterId: number | null;
  kind: TrailmarkKind;
  description: string;
  significance: number;
  createdAt: number;
}

export interface PairingWisdom {
  id: number;
  category: WisdomCategory;
  pattern: string;
  guidance: string;
  evidenceCount: number;
  confidence: number;
  hitCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface OpenLoop {
  id: number;
  description: string;
  category: LoopCategory;
  sourceType: string | null;
  sourceId: string | null;
  significance: number;
  status: LoopStatus;
  recommendedAction: LoopAction | null;
  earliestResurface: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface CalibrationEntry {
  id: number;
  key: string;
  value: number;
  domain: string | null;
  evidenceCount: number;
  trajectory: CalibrationTrajectory;
  updatedAt: number;
}

export interface Omen {
  id: number;
  forecast: string;
  confidence: number;
  horizon: number | null;
  resolvedAt: number | null;
  outcome: string | null;
  predictionError: number | null;
  createdAt: number;
}

export interface TrailPreamble {
  id: number;
  text: string;
  version: number;
  compiledAt: number;
}

export interface SweepState {
  id: number;
  lastSweepAt: number;
  updatedAt: number;
}
