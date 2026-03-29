import type { CodexDb } from "@ghostpaw/codex";
import { initCodexTables } from "@ghostpaw/codex";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemorySubsystemDb, openSubsystemDb } from "./open_subsystem.ts";

const init = (h: DatabaseHandle) => initCodexTables(h as unknown as CodexDb);

export const openCodexDatabase = (homePath: string) => openSubsystemDb(homePath, "codex.db", init);

export const openMemoryCodexDatabase = () => openMemorySubsystemDb(init);
