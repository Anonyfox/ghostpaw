import type { DatabaseHandle } from "../../../lib/index.ts";
import type {
  GatherSlices,
  OmenEvidence,
  SurpriseResult,
  SurpriseScore,
} from "../internal/index.ts";
import { rowToCalibration, rowToOmen } from "../internal/index.ts";

export function scoreSurprise(db: DatabaseHandle, slices: GatherSlices): SurpriseResult {
  const scores: SurpriseScore[] = [];
  const omensForResolution: OmenEvidence[] = [];

  const now = Date.now();
  const unresolvedOmens = db
    .prepare(
      "SELECT * FROM trail_omens WHERE resolved_at IS NULL AND horizon IS NOT NULL AND horizon <= ?",
    )
    .all(now) as Record<string, unknown>[];

  for (const row of unresolvedOmens) {
    const omen = rowToOmen(row);
    const evidence = buildOmenEvidence(omen.forecast, slices);
    omensForResolution.push({ omen, evidence });
  }

  const calibrationRows = db.prepare("SELECT * FROM trail_calibration").all() as Record<
    string,
    unknown
  >[];

  for (const row of calibrationRows) {
    const entry = rowToCalibration(row);
    const actual = deriveActual(entry.key, slices);
    if (actual !== null) {
      const divergence = Math.abs(actual - entry.value) / Math.max(Math.abs(entry.value), 0.01);
      if (divergence > 0.1) {
        scores.push({
          domain: entry.domain ?? "unknown",
          metric: entry.key,
          expected: entry.value,
          actual,
          divergence,
        });
      }
    }
  }

  scores.sort((a, b) => b.divergence - a.divergence);

  return { scores, omensForResolution };
}

function buildOmenEvidence(forecast: string, slices: GatherSlices): string {
  const parts: string[] = [`Forecast: ${forecast}`];
  if (slices.chat) parts.push(`Sessions since last sweep: ${(slices.chat as unknown[]).length}`);
  if (slices.quests) parts.push(`Quest changes: ${(slices.quests as unknown[]).length}`);
  if (slices.skills) parts.push(`Skill events: ${(slices.skills as unknown[]).length}`);
  return parts.join(". ");
}

function deriveActual(key: string, slices: GatherSlices): number | null {
  if (key === "chat.session_count" && slices.chat) {
    return (slices.chat as unknown[]).length;
  }
  if (key === "quests.active_count" && slices.quests) {
    return (slices.quests as unknown[]).length;
  }
  return null;
}
