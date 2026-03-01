import type { DatabaseHandle } from "../../lib/index.ts";
import { getSoul } from "./get_soul.ts";
import type { Soul } from "./types.ts";

export function getActiveSoul(db: DatabaseHandle, id: number): Soul {
  const soul = getSoul(db, id);
  if (!soul) {
    throw new Error(`Soul with ID ${id} not found.`);
  }
  if (soul.deletedAt != null) {
    throw new Error(`Soul "${soul.name}" (ID ${id}) is archived and cannot be modified.`);
  }
  return soul;
}
