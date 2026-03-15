import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { WisdomCategory } from "../../internal/index.ts";
import { rowToOpenLoop, rowToWisdom } from "../../internal/index.ts";

export interface SkillOpportunitySignal {
  source: "open_loop" | "wisdom";
  description: string;
  significance: number;
  category?: WisdomCategory;
  createdAt: number;
}

export function listSkillOpportunitySignals(
  db: DatabaseHandle,
  limit?: number,
): SkillOpportunitySignal[] {
  const cap = limit ?? 10;

  const loopRows = db
    .prepare(
      `SELECT * FROM trail_open_loops
       WHERE status = 'alive' AND source_type = 'skill'
       ORDER BY significance DESC LIMIT ?`,
    )
    .all(cap) as Record<string, unknown>[];
  const loopSignals: SkillOpportunitySignal[] = loopRows.map((r) => {
    const loop = rowToOpenLoop(r);
    return {
      source: "open_loop",
      description: loop.description,
      significance: loop.significance,
      createdAt: loop.createdAt,
    };
  });

  const wisdomRows = db
    .prepare(
      `SELECT * FROM trail_pairing_wisdom
       WHERE category = 'workflow' AND confidence >= 0.3
       ORDER BY confidence DESC LIMIT ?`,
    )
    .all(cap) as Record<string, unknown>[];
  const wisdomSignals: SkillOpportunitySignal[] = wisdomRows.map((r) => {
    const w = rowToWisdom(r);
    return {
      source: "wisdom",
      description: `${w.pattern} — ${w.guidance}`,
      significance: w.confidence,
      category: w.category,
      createdAt: w.updatedAt,
    };
  });

  return [...loopSignals, ...wisdomSignals]
    .sort((a, b) => b.significance - a.significance)
    .slice(0, cap);
}
