import { deleteManagedSecret } from "../../harness/public/settings/secrets.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

export function handleSecretsDelete(db: DatabaseHandle, key: string): boolean {
  return deleteManagedSecret(db, key).existed;
}
