import { listConfigInfo } from "../../core/config/api/read/index.ts";
import type { ConfigCategory, ConfigInfo } from "../../core/config/api/types.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { style } from "../../lib/terminal/index.ts";

export function formatConfigList(db: DatabaseHandle, category?: ConfigCategory): string[] {
  let entries = listConfigInfo(db);
  if (category) {
    entries = entries.filter((e) => e.category === category);
  }

  const grouped = new Map<string, ConfigInfo[]>();
  for (const entry of entries) {
    const cat = entry.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(entry);
  }

  const lines: string[] = [""];

  for (const [cat, catEntries] of grouped) {
    lines.push(`  ${style.bold(cat)}`);
    for (const entry of catEntries) {
      const isDefault = entry.isDefault;
      const marker = isDefault ? style.dim("\u00B7") : style.green("\u2713");
      const displayValue = formatDisplayValue(entry);
      const keyStr = isDefault ? style.dim(entry.key) : entry.key;
      const valueStr = isDefault ? style.dim(`= ${displayValue}`) : `= ${displayValue}`;
      const meta = formatMeta(entry, isDefault);
      lines.push(`    ${marker} ${keyStr.padEnd(30)} ${valueStr}  ${style.dim(meta)}`);
    }
    lines.push("");
  }

  if (lines.length === 1) {
    lines.push(`  ${style.dim("No configuration entries found.")}`);
    lines.push("");
  }

  lines.push(
    `  ${style.dim(`Use ${style.bold("ghostpaw config set <KEY> <VALUE>")} to configure`)}`,
  );
  lines.push("");

  return lines;
}

function formatDisplayValue(entry: ConfigInfo): string {
  if (typeof entry.value === "string") return `"${entry.value}"`;
  return String(entry.value);
}

function formatMeta(entry: ConfigInfo, isDefault: boolean): string {
  const parts: string[] = [entry.type];
  if (isDefault) {
    parts.push("default");
  } else if (entry.source !== "default") {
    parts.push(`set via ${entry.source}`);
  }
  return `(${parts.join(", ")})`;
}
