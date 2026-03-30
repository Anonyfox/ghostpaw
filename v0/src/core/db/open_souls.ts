import type { SoulsDb } from "@ghostpaw/souls";
import { initSoulsTables } from "@ghostpaw/souls";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemorySubsystemDb, openSubsystemDb } from "./open_subsystem.ts";

const init = (h: DatabaseHandle) => initSoulsTables(h as unknown as SoulsDb);

export const openSoulsDatabase = (homePath: string) => openSubsystemDb(homePath, "souls.db", init);

export const openMemorySoulsDatabase = () => openMemorySubsystemDb(init);
