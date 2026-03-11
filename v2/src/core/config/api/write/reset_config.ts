import type { DatabaseHandle } from "../../../../lib/index.ts";
import { deleteConfig } from "../../delete_config.ts";

export function resetConfig(db: DatabaseHandle, key: string): void {
  deleteConfig(db, key);
}
