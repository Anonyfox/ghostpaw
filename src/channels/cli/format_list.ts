import { listSecretStatus } from "../../core/secrets/api/read/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { style } from "../../lib/terminal/index.ts";

export function formatSecretsList(db: DatabaseHandle): string[] {
  const status = listSecretStatus(db);
  const lines: string[] = [];

  const categories = [
    { title: "LLM", keys: status.filter((key) => key.category === "llm") },
    { title: "Search", keys: status.filter((key) => key.category === "search") },
    { title: "Channels", keys: status.filter((key) => key.category === "telegram") },
  ];

  lines.push("");
  for (const cat of categories) {
    lines.push(`  ${style.bold(cat.title)}`);
    for (const k of cat.keys) {
      const configured = k.configured;
      const isActive = cat.title === "Search" && k.isActiveSearch;
      const marker = configured ? style.green("\u2713") : style.dim("\u00B7");
      const nameStr = configured ? k.label : style.dim(k.label);
      const keyStr = style.dim(k.key);
      const tag = isActive ? ` ${style.cyan("active")}` : "";
      lines.push(`    ${marker} ${nameStr.padEnd(22)} ${keyStr}${tag}`);
    }
    lines.push("");
  }

  const customKeys = status.filter((entry) => entry.category === "custom");
  if (customKeys.length > 0) {
    lines.push(`  ${style.bold("Custom")}`);
    for (const entry of customKeys) {
      lines.push(`    ${style.green("\u2713")} ${entry.key}`);
    }
    lines.push("");
  }

  if (!status.some((entry) => entry.isActiveSearch)) {
    lines.push(`  ${style.dim("Search: DDG free fallback (set a key above for better results)")}`);
  }
  lines.push(`  ${style.dim(`Use ${style.bold("ghostpaw secrets set <KEY>")} to configure`)}`);
  lines.push("");

  return lines;
}
