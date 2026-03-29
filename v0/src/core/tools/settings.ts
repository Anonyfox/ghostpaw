import { createTool, Schema } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { canonicalizeKey } from "../settings/canonicalize.ts";
import { getSetting } from "../settings/get.ts";
import { KNOWN_SETTINGS } from "../settings/known.ts";
import { listSettings } from "../settings/list.ts";
import { resetSetting } from "../settings/reset.ts";
import { setSetting } from "../settings/set.ts";
import { undoSetting } from "../settings/undo.ts";

class SettingsParams extends Schema {
  action = Schema.String({
    description:
      "Exactly one of: list, get, set, reset, undo. " +
      "list = show all settings; get = show one setting by key; " +
      "set = store a value; reset = remove all overrides, return to default; " +
      "undo = revert to previous value.",
  });
  key = Schema.String({
    description:
      "The setting key (UPPER_SNAKE_CASE). Required for get, set, reset, undo. " +
      "Internal settings use GHOSTPAW_ prefix (e.g. GHOSTPAW_MODEL). " +
      "External secrets use standard names (e.g. ANTHROPIC_API_KEY). " +
      "Shorthand like 'model' auto-resolves to GHOSTPAW_MODEL.",
    optional: true,
  });
  value = Schema.String({
    description: "The new value to store (required for set action only).",
    optional: true,
  });
  secret = Schema.Boolean({
    description:
      "Mark as secret (scrubbed from output). Only needed for custom keys; " +
      "known keys like API keys are auto-detected as secrets.",
    optional: true,
  });
}

export function createSettingsTool(db: DatabaseHandle) {
  return createTool({
    name: "settings",
    description:
      "Persistent key-value store for configuration and secrets. ANY value that looks " +
      "like an API key, token, credential, URL with auth, or operational setting MUST be " +
      "stored here -- do not put them in files, environment variables, or code. Every " +
      "stored value is immediately available as an environment variable (the key IS the " +
      "env name) in the current process and ALL child processes (bash, subagents, pulse " +
      "jobs) without restart. Secret values are automatically scrubbed from all tool " +
      "output. Keys are UPPER_SNAKE_CASE (shorthand auto-resolves, e.g. 'model' becomes " +
      "GHOSTPAW_MODEL). Changes take effect immediately. " +
      "Actions: list (show all), get (show one), set (store value), reset (remove all " +
      "overrides and history, return to default), undo (revert one step).",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new SettingsParams() as any,
    execute: async ({ args }) => {
      const { key, value, secret } = args as {
        action: string;
        key?: string;
        value?: string;
        secret?: boolean;
      };
      const action = String(args.action ?? "")
        .trim()
        .toLowerCase();

      if (action === "list") {
        const entries = listSettings(db);
        const grouped: Record<string, typeof entries> = {};
        for (const e of entries) {
          const cat = e.category;
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(e);
        }
        return { action: "list", settings: grouped, total: entries.length };
      }

      if (!key || !key.trim()) {
        return { error: `key is required for action "${action}"` };
      }

      const canonical = canonicalizeKey(key);

      if (action === "get") {
        const known = KNOWN_SETTINGS[canonical];
        const dbHead = db
          .prepare("SELECT secret FROM settings WHERE key = ? AND next_id IS NULL")
          .get(canonical) as { secret: number } | undefined;
        const isSecret = known?.secret ?? dbHead?.secret === 1;
        const val = getSetting(canonical);
        if (val === undefined && !known && !dbHead) {
          return { action: "get", error: `Unknown setting: ${canonical}` };
        }
        return {
          action: "get",
          key: canonical,
          value: isSecret ? "***" : (val ?? known?.defaultValue ?? "(not set)"),
          secret: isSecret,
          category: known?.category ?? "custom",
          description: known?.description,
          source: val !== undefined ? "configured" : "default",
        };
      }

      if (action === "set") {
        if (value === undefined || value === null) {
          return { action: "set", error: "value is required for set action" };
        }
        const result = setSetting(db, canonical, String(value), {
          source: "chat",
          secret,
        });
        const known = KNOWN_SETTINGS[result.key];
        const response: Record<string, unknown> = {
          action: "set",
          ok: true,
          key: result.key,
          secret: known?.secret ?? secret ?? false,
        };
        if (result.warning) response.warning = result.warning;
        if (known?.secret) {
          response.note =
            "For security, prefer setting secrets via CLI: ghostpaw secret set <key> <value>";
        }
        return response;
      }

      if (action === "reset") {
        const result = resetSetting(db, canonical);
        if (result.deleted === 0) {
          return { action: "reset", error: `No setting found for key: ${canonical}` };
        }
        return { action: "reset", ok: true, key: canonical, deleted: result.deleted };
      }

      if (action === "undo") {
        const result = undoSetting(db, canonical);
        if (!result.undone) {
          return { action: "undo", error: `No setting to undo for key: ${canonical}` };
        }
        const currentVal = getSetting(canonical);
        return {
          action: "undo",
          ok: true,
          key: canonical,
          reverted_to: currentVal ?? "(default)",
        };
      }

      if (action === "delete") {
        return {
          error:
            'The "delete" action was renamed to "reset" (returns key to default). ' +
            "Please use reset instead.",
        };
      }

      return {
        error: `Unknown action "${action}". Must be exactly one of: list, get, set, reset, undo.`,
      };
    },
  });
}
