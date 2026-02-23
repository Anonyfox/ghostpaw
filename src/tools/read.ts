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

export function createReadTool(workspacePath: string) {
  return createTool({
    name: "read",
    description:
      "Read file contents. Supports optional line ranges with startLine/endLine (1-indexed).",
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

      if (startLine !== undefined || endLine !== undefined) {
        const lines = raw.split("\n");
        const start = Math.max(1, startLine ?? 1);
        const end = Math.min(lines.length, endLine ?? lines.length);
        const sliced = lines.slice(start - 1, end);
        return { content: addLineNumbers(sliced.join("\n"), start) };
      }

      return { content: addLineNumbers(raw, 1) };
    },
  });
}
