import { KNOWN_SETTINGS } from "./known.ts";

export function canonicalizeKey(input: string): string {
  const upper = input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  if (KNOWN_SETTINGS[upper]) return upper;
  if (KNOWN_SETTINGS[`GHOSTPAW_${upper}`]) return `GHOSTPAW_${upper}`;
  return upper;
}
