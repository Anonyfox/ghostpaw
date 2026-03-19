import { getSecretValue, setProtectedSecret } from "../../core/secrets/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { hashPassword } from "../web/server/hash_password.ts";
import { isHashedPassword } from "../web/server/is_hashed_password.ts";

export interface PrepareWebResult {
  passwordHash: string;
  port: number;
  host: string;
  version: string;
}

export async function prepareWeb(
  db: DatabaseHandle,
  version: string,
): Promise<PrepareWebResult | null> {
  let raw = getSecretValue(db, "WEB_UI_PASSWORD");

  if (!raw && process.env.WEB_UI_PASSWORD) {
    raw = process.env.WEB_UI_PASSWORD;
    setProtectedSecret(db, "WEB_UI_PASSWORD", raw);
  }

  if (!raw) return null;

  let passwordHash: string;
  if (isHashedPassword(raw)) {
    passwordHash = raw;
  } else {
    passwordHash = await hashPassword(raw);
    setProtectedSecret(db, "WEB_UI_PASSWORD", passwordHash);
  }

  const port = Number.parseInt(process.env.WEB_UI_PORT ?? "3000", 10);
  const host = "127.0.0.1";

  return { passwordHash, port, host, version };
}
