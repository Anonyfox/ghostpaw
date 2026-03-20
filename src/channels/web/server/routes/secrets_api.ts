import { listSecretStatus } from "../../../../core/secrets/api/read/index.ts";
import {
  deleteManagedSecret,
  setManagedSecret,
} from "../../../../harness/public/settings/secrets.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import { readJsonBody } from "../body_parser.ts";
import type { RouteContext } from "../types.ts";

interface SecretInfo {
  key: string;
  label: string;
  category: "llm" | "search" | "telegram" | "custom";
  configured: boolean;
  isActiveSearch: boolean;
}

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

export function createSecretsApiHandlers(db: DatabaseHandle) {
  return {
    list(ctx: RouteContext): void {
      const secrets: SecretInfo[] = listSecretStatus(db);
      json(ctx, 200, { secrets });
    },

    async set(ctx: RouteContext): Promise<void> {
      let body: unknown;
      try {
        body = await readJsonBody(ctx.req);
      } catch {
        json(ctx, 400, { error: "Invalid request body." });
        return;
      }

      if (typeof body !== "object" || body === null) {
        json(ctx, 400, { error: "Invalid request body." });
        return;
      }

      const { key, value } = body as Record<string, unknown>;
      if (typeof key !== "string" || !key.trim()) {
        json(ctx, 400, { error: "Missing or empty key." });
        return;
      }
      if (typeof value !== "string" || !value.trim()) {
        json(ctx, 400, { error: "Missing or empty value." });
        return;
      }

      const result = setManagedSecret(db, key, value);
      if (!result.success) {
        json(ctx, 400, { error: result.error ?? "Value was empty after cleaning." });
        return;
      }

      json(ctx, 200, { ok: true, ...(result.warning ? { warning: result.warning } : {}) });
    },

    remove(ctx: RouteContext): void {
      const key = ctx.params.key ?? "";
      deleteManagedSecret(db, key);
      json(ctx, 200, { ok: true });
    },
  };
}
