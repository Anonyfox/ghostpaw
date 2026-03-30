import { read, type SoulsDb } from "@ghostpaw/souls";
import type { DatabaseHandle } from "../../lib/database_handle.ts";

/**
 * Renders a soul's identity block by numeric ID.
 *
 * Bridges the DatabaseHandle type to SoulsDb so callers never need to touch
 * the souls package directly.
 */
export function renderSoul(soulsDb: DatabaseHandle, soulId: number): string {
  return read.renderSoul(soulsDb as unknown as SoulsDb, soulId);
}
