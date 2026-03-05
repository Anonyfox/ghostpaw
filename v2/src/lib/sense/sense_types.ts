export type SenseState =
  | "openness"
  | "highway"
  | "building"
  | "mixed"
  | "insufficient"
  | "code_detected";

export type Modality = "prose" | "code" | "dialogue";

export type ConditionType =
  | "PREMATURE_CONVERGENCE"
  | "GENUINE_COMPLETION"
  | "BREAKTHROUGH"
  | "HIGHWAY_DRIFT";

export interface SenseMetrics {
  compression?: number;
  negation?: number;
  shortSentences?: number;
  semanticDistance?: number;
  momentum?: number;
  phaseTransitions?: number;
  selfReference?: number;
  sentenceLengthMean?: number;
  sentenceLengthSD?: number;
}

export interface SenseTextInfo {
  sentences: number;
  words: number;
  modality: Modality;
}

export type SenseStatus = "ok" | "attention";
export type SenseConfidence = "high" | "moderate" | "borderline";

export interface SenseVelocity {
  speed: number;
  trajectory: string;
  dominant: string;
  direction: "rising" | "falling" | "stable";
  momentumLabel?: "sustained" | "oscillating" | "low" | "moderate";
}

export interface SenseResult {
  status: SenseStatus;
  state: SenseState;
  confidence: SenseConfidence;
  condition?: ConditionType;
  intervention?: string;
  metrics: SenseMetrics;
  textInfo: SenseTextInfo;
  velocity?: SenseVelocity;
}

export interface PreviousReading {
  metrics: SenseMetrics;
  textInfo?: SenseTextInfo;
}
