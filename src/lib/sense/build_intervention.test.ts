import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildBreakthroughIntervention,
  buildConvergenceIntervention,
  buildGenuineIntervention,
  buildHighwayIntervention,
} from "./build_intervention.ts";
import { splitSentences } from "./split_sentences.ts";
import { tokenize } from "./tokenize.ts";

describe("buildConvergenceIntervention", () => {
  it("includes metric values", () => {
    const text = buildConvergenceIntervention({
      momentum: 0.15,
      phaseTransitions: 3,
      semanticDistance: 0.65,
    });
    ok(text.includes("0.150"));
    ok(text.includes("3"));
    ok(text.includes("0.650"));
  });

  it("has openness-coded structure: short sentences and negation", () => {
    const text = buildConvergenceIntervention({
      momentum: 0.1,
      phaseTransitions: 2,
      semanticDistance: 0.6,
    });
    const sents = splitSentences(text, 1);
    const shortCount = sents.filter((s) => tokenize(s).length <= 5).length;
    ok(shortCount >= 2, `expected >= 2 short sentences, got ${shortCount}`);

    const words = tokenize(text);
    const negWords = words.filter((w) => ["not", "no", "don't", "isn't"].includes(w));
    ok(negWords.length >= 2, `expected >= 2 negation words, got ${negWords.length}`);
  });
});

describe("buildHighwayIntervention", () => {
  it("includes metric values", () => {
    const text = buildHighwayIntervention({
      negation: 0.008,
      shortSentences: 0.04,
      phaseTransitions: 0,
      sentenceLengthMean: 18.5,
    });
    ok(text.includes("0.8%"));
    ok(text.includes("4.0%"));
    ok(text.includes("18.5"));
  });

  it("has openness-coded structure", () => {
    const text = buildHighwayIntervention({ negation: 0.005, shortSentences: 0.03 });
    const words = tokenize(text);
    const negWords = words.filter((w) => ["not", "no", "don't", "nothing"].includes(w));
    ok(negWords.length >= 2, `expected >= 2 negation words, got ${negWords.length}`);
  });
});

describe("buildBreakthroughIntervention", () => {
  it("includes momentum delta and current values", () => {
    const text = buildBreakthroughIntervention({ momentum: 0.45, compression: 0.42 }, 0.3);
    ok(text.includes("0.300"));
    ok(text.includes("0.450"));
    ok(text.includes("0.4200"));
  });
});

describe("buildGenuineIntervention", () => {
  it("signals completion rather than continuation", () => {
    const text = buildGenuineIntervention({ momentum: 0.05, compression: 0.38 });
    ok(text.includes("Genuine completion"));
    ok(text.includes("natural stopping point"));
  });
});
