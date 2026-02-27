import {
  deleteConfig,
  getCurrentEntry,
  KNOWN_CONFIG_KEYS,
  listConfig,
  setConfig,
  undoConfig,
} from "../../../../core/config/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { ConfigInfo } from "../../shared/config_types.ts";
import type { RouteContext } from "../types.ts";
import { parseConfigSetBody } from "./parse_config_set_body.ts";

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
          description: known?.description,
        };
      });
      json(ctx, 200, { config });
    },

    async set(ctx: RouteContext): Promise<void> {
      const result = await parseConfigSetBody(ctx.req);
      if ("error" in result) {
        json(ctx, 400, { error: result.error });
        return;
      }
      try {
        setConfig(db, result.key, result.value, "web", result.isKnown ? undefined : result.type);
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
