import type { SkillFrontmatter } from "./types.ts";

export interface ParsedFrontmatter {
  frontmatter: SkillFrontmatter | null;
  body: string;
}

const BOM = "\uFEFF";
const DELIMITER = "---";

function stripBom(content: string): string {
  return content.startsWith(BOM) ? content.slice(1) : content;
}

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, "\n");
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function tryParseJson(value: string): Record<string, string> | undefined {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) return undefined;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // not valid JSON
  }
  return undefined;
}

function parseBool(value: string): boolean | undefined {
  const lower = value.trim().toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;
  return undefined;
}

function extractFrontmatterBlock(content: string): { yaml: string; body: string } | null {
  const normalized = normalizeLineEndings(stripBom(content));
  if (!normalized.startsWith(DELIMITER)) return null;

  const afterFirst = normalized.indexOf("\n");
  if (afterFirst === -1) return null;

  const closingIdx = normalized.indexOf(`\n${DELIMITER}`, afterFirst);
  if (closingIdx === -1) return null;

  const yaml = normalized.slice(afterFirst + 1, closingIdx);
  const bodyStart = closingIdx + 1 + DELIMITER.length;
  const body = normalized.slice(bodyStart).replace(/^\n+/, "");

  return { yaml, body };
}

function parseYamlLines(yaml: string): Record<string, string> {
  const raw: Record<string, string> = {};
  let currentKey = "";
  let currentValue = "";
  let inMultiLine = false;

  for (const line of yaml.split("\n")) {
    if (inMultiLine) {
      if (line.startsWith("  ") || line.startsWith("\t") || line.trim() === "") {
        currentValue += `\n${line}`;
        continue;
      }
      raw[currentKey] = currentValue.trim();
      inMultiLine = false;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    if (!key || key.startsWith("#")) continue;

    const rest = line.slice(colonIdx + 1);
    if (rest.trim() === "" || rest.trim() === "|" || rest.trim() === ">") {
      currentKey = key;
      currentValue = "";
      inMultiLine = true;
      continue;
    }

    raw[key] = rest.trim();
    currentKey = key;
  }

  if (inMultiLine && currentKey) {
    raw[currentKey] = currentValue.trim();
  }

  return raw;
}

function rawToFrontmatter(raw: Record<string, string>): SkillFrontmatter {
  const name = unquote(raw.name ?? "");
  const description = unquote(raw.description ?? "");

  const fm: SkillFrontmatter = { name, description, raw };

  if (raw.license) fm.license = unquote(raw.license);
  if (raw.compatibility) fm.compatibility = unquote(raw.compatibility);
  if (raw["allowed-tools"]) fm.allowedTools = unquote(raw["allowed-tools"]);

  if (raw["disable-model-invocation"] !== undefined) {
    fm.disableModelInvocation = parseBool(raw["disable-model-invocation"]);
  }

  if (raw.metadata) {
    const parsed = tryParseJson(raw.metadata);
    if (parsed) fm.metadata = parsed;
  }

  return fm;
}

export function parseFrontmatter(content: string): ParsedFrontmatter {
  const block = extractFrontmatterBlock(content);
  if (!block) {
    const cleaned = normalizeLineEndings(stripBom(content));
    return { frontmatter: null, body: cleaned };
  }

  const raw = parseYamlLines(block.yaml);
  if (Object.keys(raw).length === 0) {
    return { frontmatter: null, body: block.body };
  }

  return {
    frontmatter: rawToFrontmatter(raw),
    body: block.body,
  };
}
