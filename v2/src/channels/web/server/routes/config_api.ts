import type { ConfigType, ConfigValue } from "../../../../core/config/index.ts";
import {
  CONFIG_TYPES,
  deleteConfig,
  getCurrentEntry,
  inferTypeFromString,
  KNOWN_CONFIG_KEYS,
  listConfig,
  parseConfigValue,
  setConfig,
  undoConfig,
} from "../../../../core/config/index.ts";
import type { DatabaseHandle } from "../../../../lib/database.ts";
import type { ConfigInfo } from "../../shared/config_types.ts";
import { readJsonBody } from "../body_parser.ts";
import type { RouteContext } from "../types.ts";

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

export function createConfigApiHandlers(db: DatabaseHandle) {
  return {
    list(ctx: RouteContext): void {
      const entries = listConfig(db);
      const config: ConfigInfo[] = entries.map((e) => {
        const known = KNOWN_CONFIG_KEYS.find((k) => k.key === e.key);
        const isDefault = e.id === 0;
        return {
          key: e.key,
          value: e.value,
          type: e.type,
          category: e.category,
          source: isDefault ? "default" : e.source,
          isDefault,
          label: known?.label,
        };
      });
      json(ctx, 200, { config });
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

      const { key, value, type: explicitType } = body as Record<string, unknown>;
      if (typeof key !== "string" || !key.trim()) {
        json(ctx, 400, { error: "Missing or empty key." });
        return;
      }
      if (typeof value !== "string") {
        json(ctx, 400, { error: "Missing value." });
        return;
      }

      const known = KNOWN_CONFIG_KEYS.find((k) => k.key === key);
      const validExplicitType =
        typeof explicitType === "string" &&
        (CONFIG_TYPES as readonly string[]).includes(explicitType)
          ? (explicitType as ConfigType)
          : undefined;
      const type: ConfigType = known
        ? known.type
        : (validExplicitType ?? inferTypeFromString(value));

      let parsed: ConfigValue;
      try {
        parsed = parseConfigValue(value, type);
      } catch (err) {
        const detail = err instanceof Error ? err.message : "";
        json(ctx, 400, { error: `${key} expects ${type}, got "${value}". ${detail}`.trim() });
        return;
      }

      try {
        setConfig(db, key, parsed, "web", known ? undefined : type);
      } catch (err) {
        json(ctx, 400, { error: err instanceof Error ? err.message : String(err) });
        return;
      }

      json(ctx, 200, { ok: true });
    },

    undo(ctx: RouteContext): void {
      const key = ctx.params.key ?? "";
      if (!key) {
        json(ctx, 400, { error: "Missing key." });
        return;
      }
      const current = getCurrentEntry(db, key);
      if (!current) {
        json(ctx, 400, { error: `${key} has no change history to undo.` });
        return;
      }
      const undone = undoConfig(db, key);
      if (!undone) {
        json(ctx, 400, { error: `${key} has no change history to undo.` });
        return;
      }
      json(ctx, 200, { ok: true });
    },

    reset(ctx: RouteContext): void {
      const key = ctx.params.key ?? "";
      if (!key) {
        json(ctx, 400, { error: "Missing key." });
        return;
      }
      deleteConfig(db, key);
      json(ctx, 200, { ok: true });
    },
  };
}
