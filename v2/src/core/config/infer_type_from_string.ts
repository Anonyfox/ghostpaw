import type { ConfigType } from "./types.ts";

const INTEGER_RE = /^-?\d+$/;
const FLOAT_RE = /^-?\d+\.\d+$/;

export function inferTypeFromString(raw: string): ConfigType {
  if (raw === "true" || raw === "false") return "boolean";
  if (INTEGER_RE.test(raw) && !hasLeadingZero(raw)) return "integer";
  if (FLOAT_RE.test(raw) && Number.isFinite(Number(raw))) return "number";
  return "string";
}

function hasLeadingZero(s: string): boolean {
  const digits = s.startsWith("-") ? s.slice(1) : s;
  return digits.length > 1 && digits.startsWith("0");
}
