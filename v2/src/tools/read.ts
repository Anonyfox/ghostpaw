import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createTool, Schema } from "chatoyant";
import { isInsideWorkspace } from "../lib/index.ts";

class ReadParams extends Schema {
  path = Schema.String({
    description: "File path relative to the workspace root, e.g. 'src/index.ts' or 'README.md'",
  });
  startLine = Schema.Integer({
    description: "First line to return (1-indexed, inclusive). Omit to start from line 1.",
    optional: true,
  });
  endLine = Schema.Integer({
    description: "Last line to return (1-indexed, inclusive). Omit to read through the end.",
    optional: true,
  });
  maxChars = Schema.Integer({
    description:
      "Truncate output after this many characters. Prefer startLine/endLine for precise control.",
    optional: true,
  });
}

const BINARY_CHECK_BYTES = 8192;

function isBinaryContent(raw: string): boolean {
  return raw.slice(0, BINARY_CHECK_BYTES).includes("\0");
}

function addLineNumbers(content: string, startOffset: number): string {
  const lines = content.split("\n");
  const maxDigits = String(startOffset + lines.length).length;
  return lines
    .map((line, i) => `${String(startOffset + i).padStart(maxDigits)}|${line}`)
    .join("\n");
}

function truncateAtLineBreak(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const lastNewline = text.lastIndexOf("\n", limit);
  return lastNewline > 0 ? text.slice(0, lastNewline) : text.slice(0, limit);
}

const HTML_ENTITY_RE = /&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);/;

function detectAnomalies(raw: string, filePath: string): string[] {
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

export interface ReadToolOptions {
  onRead?: (relativePath: string) => void;
}

export function createReadTool(workspace: string, options?: ReadToolOptions) {
  return createTool({
    name: "read",
    description:
      "Read a file's contents from the workspace. Returns line-numbered content " +
      "(e.g. '  1|first line') plus metadata: total lines and byte size. " +
      "For large files, use startLine/endLine to read specific sections instead of " +
      "loading everything. Returns an error for binary files and paths outside the workspace. " +
      "Use ls to find files, grep to search content, and edit/write to modify files.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ReadParams() as any,
    execute: async ({ args }) => {
      const {
        path: filePath,
        startLine,
        endLine,
        maxChars,
      } = args as {
        path: string;
        startLine?: number;
        endLine?: number;
        maxChars?: number;
      };

      if (!filePath || !filePath.trim()) {
        return { error: "Path must not be empty." };
      }

      if (!isInsideWorkspace(workspace, filePath)) {
        return { error: `Access denied: "${filePath}" is outside the workspace.` };
      }

      const fullPath = join(workspace, filePath);

      let raw: string;
      try {
        raw = readFileSync(fullPath, "utf-8");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: `Failed to read "${filePath}": ${msg}` };
      }

      if (isBinaryContent(raw)) {
        return {
          error: `"${filePath}" appears to be a binary file — not readable as text.`,
          bytes: Buffer.byteLength(raw, "utf-8"),
        };
      }

      options?.onRead?.(filePath);

      const allLines = raw.split("\n");
      const totalLines = allLines.length;
      const totalBytes = Buffer.byteLength(raw, "utf-8");
      const anomalies = detectAnomalies(raw, filePath);
      const charLimit = maxChars && maxChars > 0 ? maxChars : 0;

      const hasStart = typeof startLine === "number" && startLine > 0;
      const hasEnd = typeof endLine === "number" && endLine > 0;

      if (hasStart || hasEnd) {
        const start = Math.max(1, hasStart ? startLine : 1);
        const end = Math.min(totalLines, hasEnd ? endLine : totalLines);
        const sliced = allLines.slice(start - 1, end);
        let numbered = addLineNumbers(sliced.join("\n"), start);

        let truncated = false;
        if (charLimit && numbered.length > charLimit) {
          numbered = truncateAtLineBreak(numbered, charLimit);
          truncated = true;
        }

        const result: Record<string, unknown> = {
          lines: totalLines,
          bytes: totalBytes,
          range: `${start}-${end}`,
          content: numbered,
        };
        if (truncated) {
          result.truncated = true;
          result.notice = `Truncated at ~${charLimit} chars. Use startLine/endLine for precise ranges.`;
        }
        if (anomalies.length > 0) result.warning = anomalies.join(" ");
        return result;
      }

      let numbered = addLineNumbers(raw, 1);
      let truncated = false;
      if (charLimit && numbered.length > charLimit) {
        numbered = truncateAtLineBreak(numbered, charLimit);
        truncated = true;
      }

      const result: Record<string, unknown> = {
        lines: totalLines,
        bytes: totalBytes,
        content: numbered,
      };
      if (truncated) {
        result.truncated = true;
        result.notice = `Truncated at ~${charLimit} chars. Total: ${raw.length} chars. Use startLine/endLine to read specific sections.`;
      }
      if (anomalies.length > 0) result.warning = anomalies.join(" ");
      return result;
    },
  });
}
