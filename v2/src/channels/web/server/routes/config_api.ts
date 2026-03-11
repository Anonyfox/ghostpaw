import { listConfigInfo } from "../../../../core/config/api/read/index.ts";
import {
  resetConfigValue,
  setConfigValue,
  undoConfigValue,
} from "../../../../harness/public/settings/config.ts";
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
      const config: ConfigInfo[] = listConfigInfo(db).map((entry) => ({
        key: entry.key,
        value: String(entry.value),
        type: entry.type,
        category: entry.category,
        source: entry.source,
        isDefault: entry.isDefault,
        label: entry.label,
        description: entry.description,
      }));
      json(ctx, 200, { config });
    },

    async set(ctx: RouteContext): Promise<void> {
      const result = await parseConfigSetBody(ctx.req);
      if ("error" in result) {
        json(ctx, 400, { error: result.error });
        return;
      }
      try {
        const response = setConfigValue(db, result.key, result.value, "web", result.type);
        if (!response.success) {
          json(ctx, 400, { error: response.error });
          return;
        }
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
      const undone = undoConfigValue(db, key);
      if (!undone.success) {
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
      resetConfigValue(db, key);
      json(ctx, 200, { ok: true });
    },
  };
}
