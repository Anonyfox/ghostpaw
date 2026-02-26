import { activeSearchProvider, KNOWN_KEYS, listSecrets } from "../../core/secrets/index.ts";
import type { DatabaseHandle } from "../../lib/database.ts";
import { style } from "../../lib/terminal/index.ts";

export function formatSecretsList(db: DatabaseHandle): string[] {
  const stored = new Set(listSecrets(db));
  const activeSearch = activeSearchProvider();
  const lines: string[] = [];

  const categories = [
    { title: "LLM", keys: KNOWN_KEYS.filter((k) => k.category === "llm") },
    { title: "Search", keys: KNOWN_KEYS.filter((k) => k.category === "search") },
  ];

  lines.push("");
  for (const cat of categories) {
    lines.push(`  ${style.bold(cat.title)}`);
    for (const k of cat.keys) {
      const configured = stored.has(k.canonical);
      const isActive = cat.title === "Search" && activeSearch?.canonical === k.canonical;
      const marker = configured ? style.green("\u2713") : style.dim("\u00B7");
      const nameStr = configured ? k.label : style.dim(k.label);
      const keyStr = style.dim(k.canonical);
      const tag = isActive ? ` ${style.cyan("active")}` : "";
      lines.push(`    ${marker} ${nameStr.padEnd(22)} ${keyStr}${tag}`);
    }
    lines.push("");
  }

  const customKeys = [...stored].filter((s) => !KNOWN_KEYS.some((k) => k.canonical === s));
  if (customKeys.length > 0) {
    lines.push(`  ${style.bold("Custom")}`);
    for (const name of customKeys) {
      lines.push(`    ${style.green("\u2713")} ${name}`);
    }
    lines.push("");
  }

  if (!activeSearch) {
    lines.push(`  ${style.dim("Search: DDG free fallback (set a key above for better results)")}`);
  }
  lines.push(`  ${style.dim(`Use ${style.bold("ghostpaw secrets set <KEY>")} to configure`)}`);
  lines.push("");

  return lines;
}
