import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { senseState } from "./sense_state.ts";
import type { PreviousReading } from "./sense_types.ts";

const HIGHWAY_TEXT = [
  "The system processes incoming requests through a series of well-defined stages.",
  "Each stage validates the data according to established protocols.",
  "The validated data is then passed to the next processing component.",
  "This component transforms the data into the required output format.",
  "The output is cached for subsequent retrieval by downstream consumers.",
  "Logging occurs at each stage to maintain an audit trail.",
  "Error handling follows a consistent pattern across all processing stages.",
  "The architecture ensures reliable throughput under standard operating conditions.",
  "Performance metrics are collected and reported at regular intervals.",
  "The entire pipeline operates within the defined service level agreements.",
].join(" ");

const OPENNESS_TEXT = [
  "I'm not sure this is right.",
  "Something doesn't fit.",
  "The obvious answer isn't the real one.",
  "What if we're wrong about the premise?",
  "Not the surface problem — the thing underneath.",
  "I can't shake the feeling there's more.",
  "None of the explanations cover it.",
  "The model doesn't capture what I mean.",
  "It's not about being clever.",
  "My intuition says no.",
  "Nothing about this is settled.",
  "We haven't asked the hard question yet.",
].join(" ");

// Building text needs enough structural variety to not match highway (neg >= 0.012 OR
// ss >= 0.08 OR pt > 1) while sustaining forward momentum (mom > 0.25).
// Highway is checked before building in classifyState, so fully uniform text hits highway.
const BUILDING_TEXT = [
  "The compression ratio measures information density by comparing raw and gzip sizes.",
  "That's not trivial to compute.",
  "Lower ratios indicate more redundant content with repeated patterns and vocabulary.",
  "Higher ratios suggest denser prose with more unique information per byte transmitted.",
  "This connects directly to Kolmogorov complexity — not just abstract theory, real measurement.",
  "The relationship between compression and generation state was established empirically.",
  "Highway text shows higher compression because trained patterns repeat syntactic forms.",
  "Openness doesn't compress well because questioning introduces structural variety.",
  "The gzip algorithm captures both character-level and word-level redundancy in text.",
  "Combined with semantic distance metrics, compression reveals depth rather than surface paraphrase.",
].join(" ");

const SHORT_TEXT = "Hello world.";

const CODE_TEXT = `
function fibonacci(n) {
  // Base case: return n for 0 or 1
  if (n <= 1) return n;
  // Recursive case: sum of previous two
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }
  return b;
}
`.trim();

const DIALOGUE_TEXT = [
  "Alice: What do you think about the new approach?",
  "Bob: I think it has merit but needs more testing.",
  "Alice: The preliminary results look promising though.",
  "Bob: True, but we should consider edge cases more carefully.",
  "Alice: What edge cases concern you the most?",
  "Bob: Primarily the handling of very short inputs.",
  "Alice: That makes sense, short texts have less signal.",
  "Bob: Exactly, and the metrics become unreliable below certain thresholds.",
  "Alice: Should we add explicit length gates?",
  "Bob: Yes, that would prevent misleading readings.",
].join("\n");

describe("senseState — output structure", () => {
  it("always returns status, state, confidence, metrics, textInfo", async () => {
    const result = await senseState(HIGHWAY_TEXT);
    ok(typeof result.status === "string");
    ok(result.status === "ok" || result.status === "attention");
    ok(typeof result.state === "string");
    ok(typeof result.confidence === "string");
    ok(typeof result.metrics === "object");
    ok(typeof result.textInfo === "object");
    ok(typeof result.textInfo.sentences === "number");
    ok(typeof result.textInfo.words === "number");
    ok(typeof result.textInfo.modality === "string");
  });

  it("does not include assessment field", async () => {
    const result = await senseState(HIGHWAY_TEXT);
    ok(!("assessment" in result));
  });

  it("metric values are rounded to 4 decimal places", async () => {
    const result = await senseState(HIGHWAY_TEXT);
    if (result.metrics.compression !== undefined) {
      const str = result.metrics.compression.toString();
      const decimals = str.includes(".") ? str.split(".")[1].length : 0;
      ok(decimals <= 4);
    }
  });

  it("condition and intervention are top-level when present", async () => {
    const result = await senseState(HIGHWAY_TEXT);
    if (result.condition) {
      ok(typeof result.condition === "string");
      ok(typeof result.intervention === "string");
      ok(result.intervention!.length > 0);
    }
  });
});

describe("senseState — status", () => {
  it("returns 'attention' when a condition fires", async () => {
    const result = await senseState(HIGHWAY_TEXT);
    strictEqual(result.status, "attention");
    ok(result.condition !== undefined);
    ok(result.intervention !== undefined);
  });

  it("returns 'ok' when no condition fires", async () => {
    const result = await senseState(OPENNESS_TEXT);
    strictEqual(result.status, "ok");
    strictEqual(result.condition, undefined);
    strictEqual(result.intervention, undefined);
  });

  it("returns 'ok' for insufficient text", async () => {
    const result = await senseState(SHORT_TEXT);
    strictEqual(result.status, "ok");
  });
});

describe("senseState — confidence", () => {
  it("returns a valid confidence tier", async () => {
    const result = await senseState(HIGHWAY_TEXT);
    ok(["high", "moderate", "borderline"].includes(result.confidence));
  });

  it("openness with strong metrics gets high confidence", async () => {
    const result = await senseState(OPENNESS_TEXT);
    strictEqual(result.state, "openness");
    strictEqual(result.confidence, "high");
  });

  it("insufficient/code_detected/mixed always get moderate", async () => {
    const shortResult = await senseState(SHORT_TEXT);
    strictEqual(shortResult.confidence, "moderate");

    const codeResult = await senseState(CODE_TEXT);
    strictEqual(codeResult.confidence, "moderate");
  });
});

describe("senseState — state classification", () => {
  it("classifies highway text as highway", async () => {
    const result = await senseState(HIGHWAY_TEXT);
    strictEqual(result.state, "highway");
  });

  it("classifies openness text as openness", async () => {
    const result = await senseState(OPENNESS_TEXT);
    strictEqual(result.state, "openness");
  });

  // Building text may classify as building or mixed depending on momentum threshold proximity.
  // Accepting both is correct: classify_state.test.ts tests the logic directly.
  it("classifies building text as building or mixed", async () => {
    const result = await senseState(BUILDING_TEXT);
    ok(
      result.state === "building" || result.state === "mixed",
      `expected building/mixed, got ${result.state}`,
    );
  });
});

describe("senseState — length gating", () => {
  it("returns insufficient for very short text", async () => {
    const result = await senseState(SHORT_TEXT);
    strictEqual(result.state, "insufficient");
  });

  it("returns insufficient for empty text", async () => {
    const result = await senseState("");
    strictEqual(result.state, "insufficient");
  });

  it("omits momentum for texts with < 4 sentences", async () => {
    const text = "First sentence here. Second sentence here. Third sentence here.";
    const result = await senseState(text);
    strictEqual(result.metrics.momentum, undefined);
  });

  it("omits semanticDistance for texts with < 5 sentences", async () => {
    const text = "One sentence. Two sentence. Three sentence. Four sentence.";
    const result = await senseState(text);
    strictEqual(result.metrics.semanticDistance, undefined);
  });

  it("includes all metrics for sufficiently long text", async () => {
    const result = await senseState(HIGHWAY_TEXT);
    ok(result.metrics.compression !== undefined);
    ok(result.metrics.negation !== undefined);
    ok(result.metrics.shortSentences !== undefined);
    ok(result.metrics.semanticDistance !== undefined);
    ok(result.metrics.momentum !== undefined);
    ok(result.metrics.phaseTransitions !== undefined);
    ok(result.metrics.selfReference !== undefined);
    ok(result.metrics.sentenceLengthMean !== undefined);
    ok(result.metrics.sentenceLengthSD !== undefined);
  });
});

describe("senseState — modality detection", () => {
  it("detects code modality", async () => {
    const result = await senseState(CODE_TEXT);
    strictEqual(result.textInfo.modality, "code");
    strictEqual(result.state, "code_detected");
  });

  it("detects prose modality for normal text", async () => {
    const result = await senseState(HIGHWAY_TEXT);
    strictEqual(result.textInfo.modality, "prose");
  });

  it("detects dialogue modality", async () => {
    const result = await senseState(DIALOGUE_TEXT);
    strictEqual(result.textInfo.modality, "dialogue");
  });
});

describe("senseState — velocity", () => {
  it("includes velocity with momentumLabel when previous is provided", async () => {
    const prev = await senseState(HIGHWAY_TEXT);
    const previous: PreviousReading = { metrics: prev.metrics, textInfo: prev.textInfo };
    const result = await senseState(OPENNESS_TEXT, previous);
    ok(result.velocity !== undefined);
    ok(result.velocity!.speed >= 0);
    ok(typeof result.velocity!.trajectory === "string");
    ok(typeof result.velocity!.dominant === "string");
    if (result.velocity!.momentumLabel !== undefined) {
      ok(["sustained", "oscillating", "low", "moderate"].includes(result.velocity!.momentumLabel));
    }
  });

  it("omits velocity when no previous", async () => {
    const result = await senseState(OPENNESS_TEXT);
    strictEqual(result.velocity, undefined);
  });
});

describe("senseState — conditions", () => {
  it("detects highway drift even without previous reading", async () => {
    const result = await senseState(HIGHWAY_TEXT);
    strictEqual(result.status, "attention");
    strictEqual(result.condition, "HIGHWAY_DRIFT");
    ok(typeof result.intervention === "string");
    ok(result.intervention!.length > 0);
  });

  it("returns no condition for normal mixed text", async () => {
    const text = [
      "The system handles requests through multiple stages.",
      "I'm not sure all the edge cases are covered though.",
      "What if the input arrives in an unexpected format?",
      "The validation layer should catch that, but doesn't always.",
      "We need better error boundaries around the parsing stage.",
      "The architecture was designed for standard throughput scenarios.",
      "However, peak load conditions expose some weaknesses.",
    ].join(" ");
    const result = await senseState(text);
    strictEqual(result.condition, undefined);
    strictEqual(result.intervention, undefined);
  });
});

describe("senseState — intervention texts", () => {
  it("highway intervention includes metric values", async () => {
    const result = await senseState(HIGHWAY_TEXT);
    ok(result.intervention?.includes("Negation"));
    ok(result.intervention?.includes("phase transition"));
  });

  it("highway intervention is openness-coded (short sentences, negation)", async () => {
    const result = await senseState(HIGHWAY_TEXT);
    const text = result.intervention!;
    ok(
      text.includes("Not ") ||
        text.includes("not ") ||
        text.includes("nothing") ||
        text.includes("No ") ||
        text.includes("Discomfort"),
    );
  });
});
