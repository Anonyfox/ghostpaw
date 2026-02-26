import { getSecret } from "../../core/secrets/index.ts";
import { upsertSecret } from "../../core/secrets/upsert_secret.ts";
import type { DatabaseHandle } from "../../lib/database.ts";
import { hashPassword, isHashedPassword } from "../web/server/password.ts";

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
  let raw = getSecret(db, "WEB_UI_PASSWORD");

  if (!raw && process.env.WEB_UI_PASSWORD) {
    raw = process.env.WEB_UI_PASSWORD;
    upsertSecret(db, "WEB_UI_PASSWORD", raw);
  }

  if (!raw) return null;

  let passwordHash: string;
  if (isHashedPassword(raw)) {
    passwordHash = raw;
  } else {
    passwordHash = await hashPassword(raw);
    upsertSecret(db, "WEB_UI_PASSWORD", passwordHash);
  }

  const port = Number.parseInt(process.env.WEB_UI_PORT ?? "3000", 10);
  const host = "127.0.0.1";

  return { passwordHash, port, host, version };
}
