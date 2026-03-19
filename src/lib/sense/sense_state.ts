import { buildHighwayIntervention } from "./build_intervention.ts";
import { classifyState } from "./classify_state.ts";
import { compressionRatio } from "./compression_ratio.ts";
import { computeConfidence } from "./compute_confidence.ts";
import { computeVelocity } from "./compute_velocity.ts";
import { detectCondition } from "./detect_condition.ts";
import { detectModality, extractCommentText } from "./detect_modality.ts";
import { momentumLabel } from "./momentum_label.ts";
import { negationDensity } from "./negation_density.ts";
import { phaseTransitions } from "./phase_transitions.ts";
import { selfReferenceRate } from "./self_reference_rate.ts";
import { semanticDistanceCurve } from "./semantic_distance_curve.ts";
import { semanticMomentum } from "./semantic_momentum.ts";
import type {
  ConditionType,
  PreviousReading,
  SenseMetrics,
  SenseResult,
  SenseTextInfo,
  SenseVelocity,
} from "./sense_types.ts";
import { sentenceLengthStats } from "./sentence_length_stats.ts";
import { shortSentenceRatio } from "./short_sentence_ratio.ts";
import { splitSentences } from "./split_sentences.ts";
import { tokenize } from "./tokenize.ts";
import { trajectoryLabel } from "./trajectory_label.ts";
import { velocityDirection } from "./velocity_direction.ts";
import { velocitySpeed } from "./velocity_speed.ts";

export async function senseState(text: string, previous?: PreviousReading): Promise<SenseResult> {
  const trimmed = text.trim();
  const words = tokenize(trimmed);
  const wordCount = words.length;

  if (wordCount < 10) {
    return {
      status: "ok",
      state: "insufficient",
      confidence: "moderate",
      metrics: {},
      textInfo: { sentences: 0, words: wordCount, modality: "prose" },
    };
  }

  const comp = await compressionRatio(trimmed);
  const modality = detectModality(trimmed, comp);

  let measureText = trimmed;
  if (modality === "code") {
    const commentText = extractCommentText(trimmed);
    const commentSents = splitSentences(commentText);
    if (commentSents.length < 3) {
      return {
        status: "ok",
        state: "code_detected",
        confidence: "moderate",
        metrics: { compression: round(comp) },
        textInfo: { sentences: commentSents.length, words: wordCount, modality: "code" },
      };
    }
    measureText = commentText;
  }

  const sents = splitSentences(measureText);
  const measureWords = tokenize(measureText);
  const sentCount = sents.length;

  const metrics: SenseMetrics = {
    compression: round(comp),
    negation: round(negationDensity(measureWords)),
  };

  if (sentCount >= 3) {
    metrics.shortSentences = round(shortSentenceRatio(sents));
    metrics.selfReference = round(selfReferenceRate(measureWords));
    const stats = sentenceLengthStats(sents);
    metrics.sentenceLengthMean = round(stats.mean, 1);
    metrics.sentenceLengthSD = round(stats.stdDev, 1);
  }

  if (sentCount >= 5) {
    const curve = semanticDistanceCurve(sents);
    metrics.semanticDistance = round(curve.reduce((a, b) => a + b, 0) / curve.length);
    const pt = phaseTransitions(sents, 1.0);
    metrics.phaseTransitions = pt.count;
  }

  if (sentCount >= 4) {
    const mom = semanticMomentum(sents);
    metrics.momentum = round(mom.momentum, 3);
  }

  const textInfo: SenseTextInfo = {
    sentences: sentCount,
    words: wordCount,
    modality,
  };

  const state = classifyState(metrics, sentCount, modality);
  const confidence = computeConfidence(state, metrics, sentCount);

  let velocity: SenseVelocity | undefined;
  let detected: { type: ConditionType; intervention: string } | null = null;

  if (previous?.metrics) {
    const flatCurrent = flattenMetrics(metrics);
    const flatPrevious = flattenMetrics(previous.metrics);
    const vel = computeVelocity(flatCurrent, flatPrevious);
    const spd = velocitySpeed(vel);
    const dir = velocityDirection(vel);
    const momLabel = momentumLabel(metrics.momentum);

    velocity = {
      speed: round(spd),
      trajectory: trajectoryLabel(spd),
      dominant: dir.dominant,
      direction: dir.sign > 0 ? "rising" : dir.sign < 0 ? "falling" : "stable",
      ...(momLabel ? { momentumLabel: momLabel } : {}),
    };

    detected = detectCondition(metrics, state, previous);
  } else if (state === "highway") {
    detected = {
      type: "HIGHWAY_DRIFT",
      intervention: buildHighwayIntervention(metrics),
    };
  }

  const result: SenseResult = {
    status: detected ? "attention" : "ok",
    state,
    confidence,
    metrics,
    textInfo,
  };

  if (detected) {
    result.condition = detected.type;
    result.intervention = detected.intervention;
  }

  if (velocity) {
    result.velocity = velocity;
  }

  return result;
}

function round(n: number, decimals = 4): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function flattenMetrics(m: SenseMetrics): Record<string, number> {
  return {
    compression: m.compression ?? 0,
    negation: m.negation ?? 0,
    shortSentences: m.shortSentences ?? 0,
    phaseTransitions: m.phaseTransitions ?? 0,
    semanticDistance: m.semanticDistance ?? 0,
  };
}
