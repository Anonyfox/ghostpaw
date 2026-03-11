import type { ConfigType } from "../../core/config/api/types.ts";

export function inferTypeFromString(raw: string): ConfigType {
  if (raw === "true" || raw === "false") return "boolean";
  if (/^-?(0|[1-9]\d*)$/.test(raw)) return "integer";
  if (/^-?(0|[1-9]\d*)\.\d+$/.test(raw)) return "number";
  return "string";
}
