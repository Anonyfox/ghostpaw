import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToMember } from "./row_to_member.ts";
import type { PackMember, UpdateBondInput } from "./types.ts";
import { MEMBER_STATUSES } from "./types.ts";
import { validateMemberName } from "./validate_member_name.ts";

export function updateBond(db: DatabaseHandle, id: number, input: UpdateBondInput): PackMember {
  const existing = db.prepare("SELECT * FROM pack_members WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;

  if (!existing) {
    throw new Error(`Pack member with id ${id} not found.`);
  }

  const sets: string[] = [];
  const params: unknown[] = [];

  if (input.name !== undefined) {
    const name = validateMemberName(input.name);
    sets.push("name = ?");
    params.push(name);
  }

  if (input.bond !== undefined) {
    sets.push("bond = ?");
    params.push(input.bond.trim());
  }

  if (input.trust !== undefined) {
    if (typeof input.trust !== "number" || Number.isNaN(input.trust)) {
      throw new Error("Trust must be a number between 0 and 1.");
    }
    sets.push("trust = ?");
    params.push(Math.max(0, Math.min(1, input.trust)));
  }

  if (input.status !== undefined) {
    if (!MEMBER_STATUSES.includes(input.status)) {
      throw new Error(
        `Invalid status "${input.status}". Must be one of: ${MEMBER_STATUSES.join(", ")}.`,
      );
    }
    sets.push("status = ?");
    params.push(input.status);
  }

  if (input.metadata !== undefined) {
    let merged: Record<string, unknown>;
    try {
      merged = { ...JSON.parse(existing.metadata as string), ...JSON.parse(input.metadata) };
    } catch {
      throw new Error("Metadata must be a valid JSON string.");
    }
    sets.push("metadata = ?");
    params.push(JSON.stringify(merged));
  }

  if (sets.length === 0) {
    return rowToMember(existing);
  }

  sets.push("updated_at = ?");
  params.push(Date.now());
  params.push(id);

  db.prepare(`UPDATE pack_members SET ${sets.join(", ")} WHERE id = ?`).run(...params);

  const updated = db.prepare("SELECT * FROM pack_members WHERE id = ?").get(id);
  return rowToMember(updated as Record<string, unknown>);
}
