import { getMember, getMemberByName } from "../../core/pack/index.ts";
import type { PackMember } from "../../core/pack/types.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

export function resolveMember(db: DatabaseHandle, ref: string): PackMember | null {
  const trimmed = ref.trim();
  if (trimmed.length === 0) return null;

  const asNumber = Number(trimmed);
  if (Number.isInteger(asNumber) && asNumber > 0) {
    return getMember(db, asNumber);
  }

  return getMemberByName(db, trimmed);
}
