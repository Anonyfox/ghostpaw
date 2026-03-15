import type { SweepContext } from "../core/trail/runtime/index.ts";
import { runTrailSweep } from "../core/trail/runtime/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { createHistorianNightlyTools } from "../tools/historian/index.ts";
import { invokeHistorian } from "./invoke_historian.ts";
import type { Entity } from "./types.ts";

export interface TrailSweepResult {
  succeeded: boolean;
}

export async function runTrailSweepWithHistorian(
  entity: Entity,
  db: DatabaseHandle,
  options?: { model?: string },
): Promise<TrailSweepResult> {
  const nightlyTools = createHistorianNightlyTools(db);
  let succeeded = true;

  await runTrailSweep(db, async (_sweepDb, context: SweepContext) => {
    const prompts = buildSweepPrompts(context);
    const result = await invokeHistorian(entity, db, prompts, {
      model: options?.model,
      tools: nightlyTools,
    });
    if (!result.succeeded) {
      succeeded = false;
    }
  });

  return { succeeded };
}

function formatSliceData(context: SweepContext): string {
  const parts: string[] = [];
  for (const [name, slice] of Object.entries(context.slices)) {
    if (slice == null) continue;
    const items = Array.isArray(slice)
      ? slice
      : typeof slice === "object" && "traits" in (slice as Record<string, unknown>)
        ? [
            ...((slice as { traits: unknown[] }).traits ?? []),
            ...((slice as { levels: unknown[] }).levels ?? []),
          ]
        : [slice];
    parts.push(`### ${name} (${items.length} items)`);
    parts.push("```json");
    parts.push(JSON.stringify(items.slice(0, 25), null, 2));
    parts.push("```");
  }
  return parts.join("\n");
}

function buildTurn1(context: SweepContext, since: string, sliceNames: string[]): string {
  const hasActivity = sliceNames.length > 0;
  const surpriseBlock =
    context.surprise.scores.length > 0
      ? [
          "### Surprise Signals",
          ...context.surprise.scores
            .slice(0, 5)
            .map(
              (s) =>
                `- ${s.domain}/${s.metric}: expected ${s.expected}, got ${s.actual} (divergence ${s.divergence.toFixed(2)})`,
            ),
        ].join("\n")
      : "";

  return [
    "## Nightly Trail Sweep — Turn 1: Chronicle",
    "",
    `Sweep window: since ${since}`,
    "",
    hasActivity
      ? `Active data slices: ${sliceNames.join(", ")}`
      : "No new activity since last sweep.",
    "",
    hasActivity ? formatSliceData(context) : "",
    surpriseBlock,
    "",
    "**Your task**: Write today's chronicle entry using `write_chronicle`.",
    "Include a vivid first-person narrative of what happened, what you attempted,",
    "what surprised you, and what remains unresolved. Also fill the structured fields",
    "(highlights, surprises, unresolved). Even on quiet days, write a minimal entry.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildTurn2(): string {
  return [
    "## Nightly Trail Sweep — Turn 2: Trail State & Pairing Wisdom",
    "",
    "You have just written today's chronicle. Now use `get_trail_state` to see the",
    "current chapter and trailmarks, then:",
    "",
    "1. **Trail state**: Use `update_trail_state` to judge whether the current chapter",
    "   still holds, whether momentum has shifted, and whether any events qualify as",
    "   trailmarks (turning points, milestones, firsts, or significant shifts).",
    "   Create a new chapter only if there is a real meaning shift.",
    "",
    "2. **Pairing wisdom**: Use `list_pairing_wisdom` to see existing entries, then",
    "   use `update_pairing_wisdom` to extract new patterns, confirm existing ones",
    "   (bumping evidence count), or revise contradicted ones. Categories: tone,",
    "   framing, timing, initiative, workflow, boundaries, operational, other.",
    "   Use 'operational' for ghost-level meta-rules about when/how to apply",
    "   capabilities — tactical wisdom earned from experience, distinct from",
    "   user-specific collaboration patterns.",
    "",
    "Be conservative — only write what the evidence supports.",
  ].join("\n");
}

function buildTurn3(context: SweepContext): string {
  const omenBlock =
    context.surprise.omensForResolution.length > 0
      ? [
          "### Omens Ready for Resolution",
          ...context.surprise.omensForResolution.map(
            (o) => `- [omen #${o.omen.id}] "${o.omen.forecast}" — ${o.evidence}`,
          ),
        ].join("\n")
      : "";

  return [
    "## Nightly Trail Sweep — Turn 3: Open Loops, Omens & Preamble",
    "",
    "Use `list_open_loops` and `list_omens` to see current state, then:",
    "",
    "1. **Open loops**: Use `update_open_loops` to create new unresolved threads,",
    "   update significance on touched loops, resolve naturally closed loops, and",
    "   dismiss low-signal ones. Each loop needs a recommended action (ask, revisit,",
    "   remind, wait, leave) and optional earliest resurface date.",
    "",
    "   **Curiosity loops**: When you notice information gaps in the gathered data —",
    "   people referenced but unknown to pack, topic clusters with no memory backing,",
    "   recurring patterns you cannot explain — create curiosity-category open loops",
    "   with recommended_action 'ask'. These are questions ghostpaw genuinely wants",
    "   answered. Keep them specific and natural-sounding. Do not generate curiosity",
    "   loops for gaps that will resolve on their own.",
    "",
    "   **Resolved curiosity**: Review recently-resolved curiosity loops. If an answer",
    "   reveals deeper gaps worth exploring, create follow-up curiosity loops. If the",
    "   answer was trivial, no follow-up needed.",
    "",
    omenBlock
      ? `2. **Resolve omens**: The following omens have elapsed:\n${omenBlock}\n   Use \`resolve_omens\` with outcome text and prediction error (0-1).`
      : "2. **Resolve omens**: No omens are due for resolution.",
    "",
    "3. **New omens**: Use `write_omens` to create forward predictions about what",
    "   is likely to matter next. Each omen needs confidence (0-1) and a horizon",
    "   as a relative number of days from now (e.g. 7 for one week, 30 for a month).",
    "",
    "4. **Calibration**: Use `update_calibration` for any numeric coefficients you",
    "   can derive from today's evidence (planning multipliers, timing heuristics, etc.).",
    "",
    "5. **Preamble**: Use `compile_preamble` to write a 1-3 line behavior-shaping",
    "   preamble. Line 1: highest-confidence pairing wisdom guidance. Line 2: current",
    "   chapter + momentum (if relevant). Line 3: a specific timing or initiative cue",
    "   (optional). Only change it if meaningfully different from current.",
  ].join("\n");
}

function buildSweepPrompts(context: SweepContext): string[] {
  const since = new Date(context.sinceMs).toISOString();
  const sliceNames = Object.entries(context.slices)
    .filter(([, v]) => v != null)
    .map(([k]) => k);
  return [buildTurn1(context, since, sliceNames), buildTurn2(), buildTurn3(context)];
}
