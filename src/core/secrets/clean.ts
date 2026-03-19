import { KNOWN_KEYS } from "./known_keys.ts";
import type { CleanResult } from "./types.ts";

const KEY_PREFIXES: Record<string, string[]> = {
  API_KEY_ANTHROPIC: ["sk-ant-"],
  API_KEY_OPENAI: ["sk-"],
  API_KEY_XAI: ["xai-"],
  BRAVE_API_KEY: ["BSA"],
  TAVILY_API_KEY: ["tvly-"],
};

export function cleanKeyValue(canonical: string, raw: string): CleanResult {
  let value = raw.trim();

  if (
    value.length >= 2 &&
    ((value[0] === '"' && value.at(-1) === '"') ||
      (value[0] === "'" && value.at(-1) === "'") ||
      (value[0] === "`" && value.at(-1) === "`"))
  ) {
    value = value.slice(1, -1).trim();
  }

  const assignMatch = value.match(/^(?:export\s+)?[A-Z_]+=(.+)$/s);
  if (assignMatch) {
    value = assignMatch[1]!.trim();
    if (
      value.length >= 2 &&
      ((value[0] === '"' && value.at(-1) === '"') || (value[0] === "'" && value.at(-1) === "'"))
    ) {
      value = value.slice(1, -1).trim();
    }
  }

  if (!value) {
    return { value: "", warning: "Empty value" };
  }

  return { value, warning: checkPrefix(canonical, value) };
}

function checkPrefix(canonical: string, value: string): string | undefined {
  const ownPrefixes = KEY_PREFIXES[canonical];
  if (!ownPrefixes || ownPrefixes.length === 0) return undefined;

  const allMatches: { canonical: string; prefix: string }[] = [];
  for (const [key, prefixes] of Object.entries(KEY_PREFIXES)) {
    for (const p of prefixes) {
      if (value.startsWith(p)) allMatches.push({ canonical: key, prefix: p });
    }
  }
  allMatches.sort((a, b) => b.prefix.length - a.prefix.length);

  if (allMatches.length > 0 && allMatches[0]!.canonical !== canonical) {
    const other = KNOWN_KEYS.find((k) => k.canonical === allMatches[0]!.canonical);
    const own = KNOWN_KEYS.find((k) => k.canonical === canonical);
    return `This looks like a ${other?.label ?? allMatches[0]!.canonical} key, not ${own?.label ?? canonical}`;
  }

  const matchesOwn = ownPrefixes.some((p) => value.startsWith(p));
  if (!matchesOwn) {
    return `Expected key starting with ${ownPrefixes.join(" or ")}`;
  }

  return undefined;
}
