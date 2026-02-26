import {
  activeSearchProvider,
  deleteSecret,
  KNOWN_KEYS,
  listSecrets,
  setSecret,
} from "../../../../core/secrets/index.ts";
import type { DatabaseHandle } from "../../../../lib/database.ts";
import { readJsonBody } from "../body_parser.ts";
import type { RouteContext } from "../types.ts";

interface SecretInfo {
  key: string;
  label: string;
  category: "llm" | "search" | "custom";
  configured: boolean;
  isActiveSearch: boolean;
}

function isProtectedKey(key: string): boolean {
  return key.toUpperCase().startsWith("WEB_UI_");
}

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

export function createSecretsApiHandlers(db: DatabaseHandle) {
  return {
    list(ctx: RouteContext): void {
      const configuredKeys = new Set(listSecrets(db));
      const activeSearch = activeSearchProvider();
      const activeSearchKey = activeSearch?.canonical ?? null;

      const secrets: SecretInfo[] = KNOWN_KEYS.map((k) => ({
        key: k.canonical,
        label: k.label,
        category: k.category,
        configured: configuredKeys.has(k.canonical),
        isActiveSearch: k.canonical === activeSearchKey,
      }));

      const knownCanonicals = new Set(KNOWN_KEYS.map((k) => k.canonical));
      for (const key of configuredKeys) {
        if (knownCanonicals.has(key)) continue;
        if (key.startsWith("WEB_UI_")) continue;
        secrets.push({
          key,
          label: key,
          category: "custom",
          configured: true,
          isActiveSearch: false,
        });
      }

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

      if (isProtectedKey(key)) {
        json(ctx, 403, { error: "Cannot modify internal keys." });
        return;
      }

      const result = setSecret(db, key, value);
      if (!result.value) {
        json(ctx, 400, { error: "Value was empty after cleaning." });
        return;
      }

      json(ctx, 200, { ok: true, ...(result.warning ? { warning: result.warning } : {}) });
    },

    remove(ctx: RouteContext): void {
      const key = ctx.params.key ?? "";
      if (isProtectedKey(key)) {
        json(ctx, 403, { error: "Cannot modify internal keys." });
        return;
      }
      deleteSecret(db, key);
      json(ctx, 200, { ok: true });
    },
  };
}
