import type { DatabaseHandle } from "../../lib/index.ts";
import { getSoul } from "./get_soul.ts";
import { getSoulByName } from "./get_soul_by_name.ts";
import type { Soul } from "./types.ts";

export function resolveSoul(db: DatabaseHandle, input: string): Soul | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const asNumber = Number(trimmed);
  if (Number.isInteger(asNumber) && asNumber > 0) {
    const soul = getSoul(db, asNumber);
    if (soul && soul.deletedAt != null) return null;
    return soul;
  }

  return getSoulByName(db, trimmed);
}
