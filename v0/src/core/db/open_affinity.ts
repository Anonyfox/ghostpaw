import { initAffinityTables } from "@ghostpaw/affinity";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemorySubsystemDb, openSubsystemDb } from "./open_subsystem.ts";

const init = (h: DatabaseHandle) =>
  initAffinityTables(h as unknown as Parameters<typeof initAffinityTables>[0]);

export const openAffinityDatabase = (homePath: string) =>
  openSubsystemDb(homePath, "affinity.db", init);

export const openMemoryAffinityDatabase = () => openMemorySubsystemDb(init);
