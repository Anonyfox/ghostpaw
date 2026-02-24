import { readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { createTool, Schema } from "chatoyant";

class ReadParams extends Schema {
  path = Schema.String({ description: "File path relative to workspace" });
  startLine = Schema.Integer({ description: "Start line (1-indexed, inclusive)", optional: true });
  endLine = Schema.Integer({ description: "End line (1-indexed, inclusive)", optional: true });
}

function isInsideWorkspace(workspacePath: string, filePath: string): boolean {
  const resolved = resolve(workspacePath, filePath);
  return !relative(workspacePath, resolved).startsWith("..");
}

function addLineNumbers(content: string, startOffset: number): string {
  const lines = content.split("\n");
  const maxDigits = String(startOffset + lines.length).length;
  return lines
    .map((line, i) => `${String(startOffset + i).padStart(maxDigits)}|${line}`)
    .join("\n");
}

const HTML_ENTITY_RE = /&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);/;

export function detectAnomalies(raw: string, filePath: string): string[] {
  const warnings: string[] = [];
  const lines = raw.split("\n");
  if (lines.length === 1 && raw.length > 200) {
    warnings.push(
      `File is a single line with ${raw.length} chars — content is likely corrupted (missing newlines).`,
    );
  }
  if (!/\.html?$/i.test(filePath) && HTML_ENTITY_RE.test(raw)) {
    warnings.push("Contains HTML entities in a non-HTML file — content may be garbled.");
  }
  if (raw.includes("\\n") && !raw.includes("\n", 1) && raw.length > 50) {
    warnings.push("Contains literal \\n sequences instead of real newlines.");
  }
  return warnings;
}

export function createReadTool(workspacePath: string) {
  return createTool({
    name: "read",
    description:
      "Read file contents. Returns lines, bytes, and content. Supports optional line ranges with startLine/endLine (1-indexed).",
    // biome-ignore lint: TS index-signature limitation on class instances vs SchemaInstance
    parameters: new ReadParams() as any,
    execute: async ({ args }) => {
      const {
        path: filePath,
        startLine,
        endLine,
      } = args as {
        path: string;
        startLine?: number;
        endLine?: number;
      };

      if (!isInsideWorkspace(workspacePath, filePath)) {
        return { error: `Access denied: "${filePath}" is outside the workspace.` };
      }

      const fullPath = join(workspacePath, filePath);

      let raw: string;
      try {
        raw = readFileSync(fullPath, "utf-8");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: `Failed to read "${filePath}": ${msg}` };
      }

      const allLines = raw.split("\n");
      const totalLines = allLines.length;
      const totalBytes = Buffer.byteLength(raw, "utf-8");
      const anomalies = detectAnomalies(raw, filePath);

      const hasStart = typeof startLine === "number" && startLine > 0;
      const hasEnd = typeof endLine === "number" && endLine > 0;
      if (hasStart || hasEnd) {
        const start = Math.max(1, hasStart ? startLine : 1);
        const end = Math.min(totalLines, hasEnd ? endLine : totalLines);
        const sliced = allLines.slice(start - 1, end);
        const result: Record<string, unknown> = {
          lines: totalLines,
          bytes: totalBytes,
          range: `${start}-${end}`,
          content: addLineNumbers(sliced.join("\n"), start),
        };
        if (anomalies.length > 0) result.warning = anomalies.join(" ");
        return result;
      }

      const result: Record<string, unknown> = {
        lines: totalLines,
        bytes: totalBytes,
        content: addLineNumbers(raw, 1),
      };
      if (anomalies.length > 0) result.warning = anomalies.join(" ");
      return result;
    },
  });
}
