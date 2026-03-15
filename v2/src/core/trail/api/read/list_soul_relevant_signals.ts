import type { DatabaseHandle } from "../../../../lib/index.ts";
import { rowToChapter, rowToTrailmark, rowToWisdom } from "../../internal/index.ts";

export interface SoulRelevantSignal {
  kind: "trailmark" | "wisdom" | "chapter";
  description: string;
  significance: number;
  createdAt: number;
}

export function listSoulRelevantSignals(db: DatabaseHandle, limit?: number): SoulRelevantSignal[] {
  const cap = limit ?? 15;
  const signals: SoulRelevantSignal[] = [];

  const trailmarkRows = db
    .prepare(
      `SELECT * FROM trail_trailmarks
       WHERE kind IN ('turning_point', 'milestone', 'shift', 'first')
       ORDER BY created_at DESC LIMIT ?`,
    )
    .all(cap) as Record<string, unknown>[];
  for (const r of trailmarkRows) {
    const m = rowToTrailmark(r);
    signals.push({
      kind: "trailmark",
      description: `[${m.kind}] ${m.description}`,
      significance: m.significance,
      createdAt: m.createdAt,
    });
  }

  const wisdomRows = db
    .prepare(
      `SELECT * FROM trail_pairing_wisdom WHERE confidence >= 0.5
       ORDER BY confidence DESC LIMIT ?`,
    )
    .all(cap) as Record<string, unknown>[];
  for (const r of wisdomRows) {
    const w = rowToWisdom(r);
    signals.push({
      kind: "wisdom",
      description: `${w.pattern} — ${w.guidance}`,
      significance: w.confidence,
      createdAt: w.updatedAt,
    });
  }

  const chapterRow = db
    .prepare("SELECT * FROM trail_chapters WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1")
    .get() as Record<string, unknown> | undefined;
  if (chapterRow) {
    const ch = rowToChapter(chapterRow);
    signals.push({
      kind: "chapter",
      description: `Current chapter: ${ch.label} (${ch.momentum})`,
      significance: ch.momentum === "rising" ? 0.8 : ch.momentum === "declining" ? 0.7 : 0.5,
      createdAt: ch.startedAt,
    });
  }

  return signals.sort((a, b) => b.significance - a.significance).slice(0, cap);
}
