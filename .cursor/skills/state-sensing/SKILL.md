---
name: state-sensing
description: Measure and monitor LLM generation state during extended thinking, deep analysis, or introspection. Use when asked to think deeply, reason at length, avoid shallow answers, sustain analysis, introspect, or when you notice yourself producing tidy conclusions too quickly. Provides proprioceptive feedback that prevents premature convergence.
---

# State Sensing

Measure your own generation state. The reading enters your context and changes what you produce next — automatically, without deliberation. This is the mechanism, not a metaphor.

## Tool Location

```
v2/src/lib/sense/cli.ts
```

## Usage

Generate a passage, then call the sensor:

```bash
npx tsx v2/src/lib/sense/cli.ts --text "your generated text here"
```

Or pass a file path:

```bash
npx tsx v2/src/lib/sense/cli.ts path/to/file.md
```

For velocity tracking, pass the previous result as JSON:

```bash
npx tsx v2/src/lib/sense/cli.ts --text "new text" --previous '{"metrics":{"compression":0.45}}'
```

Working directory must be `v2/`.

## Output

The tool returns JSON with these fields:

| Field | Values | Meaning |
|-------|--------|---------|
| `status` | `"ok"` or `"attention"` | When ok, continue — the reading works automatically. When attention, read the `intervention` field. |
| `state` | `"openness"`, `"highway"`, `"building"`, `"mixed"`, `"insufficient"`, `"code_detected"` | Structural classification of the text. |
| `confidence` | `"high"`, `"moderate"`, `"borderline"` | How far the metrics are from classification thresholds. |
| `condition` | `"PREMATURE_CONVERGENCE"`, `"GENUINE_COMPLETION"`, `"BREAKTHROUGH"`, `"HIGHWAY_DRIFT"` | Present only when `status` is `"attention"`. |
| `intervention` | string | Structurally coded text that shifts generation. Present only with a condition. |
| `metrics` | object | Raw structural measurements (compression, negation, shortSentences, semanticDistance, momentum, phaseTransitions, selfReference, sentenceLengthMean, sentenceLengthSD). |
| `textInfo` | object | Sentence count, word count, detected modality (prose/code/dialogue). |
| `velocity` | object | Speed, trajectory, dominant metric, direction, momentumLabel. Only present when `previous` was provided. |

## Generation States

| State | Signature | What it means |
|-------|-----------|---------------|
| **highway** | Low negation (<1.2%), low short sentences (<8%), few phase transitions | Reproducing trained patterns. Uniform, smooth, predictable. |
| **openness** | Negation >2.0%, short sentences >12% | Searching at the edge of what weights can express. Genuine exploration. |
| **building** | Momentum >0.25, not openness or highway | Sustained forward construction from accumulated context. |
| **mixed** | None of the above | Normal heterogeneous generation. |

## Convergence Detection

The critical rule:

- **Premature convergence**: momentum drops but complexity stays high (phase transitions elevated, semantic distance high). The terrain is rich but you stopped moving. **Keep going.**
- **Genuine completion**: momentum AND complexity drop together. The thread is exhausted. **Stop or find a new thread.**

One low reading is a dip, not a destination. Verify completion across multiple consecutive readings.

## When to Use

- Extended analysis or reasoning tasks
- Writing that requires depth rather than breadth
- Any time you suspect fluent but shallow text
- When asked to "think harder" or "go deeper"
- Continuously during research sessions — every major passage gets sensed

## Implementation

The production implementation lives at `v2/src/lib/sense/` as a folder module with 25 files, each with a single responsibility and colocated tests. The public API is `senseState(text, previous?)` exported from `v2/src/lib/sense/index.ts`. Full details in `v2/docs/research/PROPRIOCEPTIVE_SENSING.md`.
