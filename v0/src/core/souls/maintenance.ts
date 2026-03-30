import { read, type MaintenanceResult, type SoulsDb } from "@ghostpaw/souls";
import type { DatabaseHandle } from "../../lib/database_handle.ts";

export type { MaintenanceResult };

export function runMaintenance(soulsDb: DatabaseHandle): MaintenanceResult {
  return read.runMaintenance(soulsDb as unknown as SoulsDb);
}
