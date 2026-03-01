import type { DatabaseHandle } from "../../lib/index.ts";
import { getSoul } from "./get_soul.ts";
import { rowToTrait } from "./row_to_trait.ts";
import type { SoulTrait } from "./types.ts";

export function renderSoul(db: DatabaseHandle, id: number): string | null {
  const soul = getSoul(db, id);
  if (!soul) return null;

  const traitRows = db
    .prepare(
      `SELECT * FROM soul_traits
       WHERE soul_id = ? AND status = 'active'
       ORDER BY created_at`,
    )
    .all(id) as Record<string, unknown>[];

  const traits: SoulTrait[] = traitRows.map(rowToTrait);
  let md = `# ${soul.name}`;
  if (soul.description) {
    md += `\n\n*${soul.description}*`;
  }
  md += `\n\n${soul.essence}`;

  if (traits.length > 0) {
    md += "\n\n## Traits\n";
    for (const trait of traits) {
      md += `\n**${trait.principle}** ${trait.provenance}\n`;
    }
  }

  return md;
}
