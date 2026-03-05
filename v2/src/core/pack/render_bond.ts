import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToMember } from "./row_to_member.ts";

export function renderBond(db: DatabaseHandle, memberId: number): string | null {
  const row = db.prepare("SELECT * FROM pack_members WHERE id = ?").get(memberId);
  if (!row) return null;

  const member = rowToMember(row as Record<string, unknown>);
  if (member.bond.length === 0) return null;

  const lines: string[] = [
    `## ${member.name} (${member.kind})`,
    "",
    member.bond,
    "",
    `Trust: ${member.trust.toFixed(2)} | Status: ${member.status}`,
  ];
  return lines.join("\n");
}
