import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createTool, Schema } from "chatoyant";
import { resolvePath } from "./resolve_path.ts";
import { sanitizeLlmContent } from "./sanitize_llm_content.ts";

class WriteParams extends Schema {
  path = Schema.String({
    description: "File path, relative to workspace root or absolute.",
  });
  content = Schema.String({
    description:
      "The complete file content to write. This replaces the entire file — not a diff or patch.",
  });
}

export function createWriteTool(workspace: string) {
  return createTool({
    name: "write",
    description:
      "Create or overwrite a file. Prefers workspace — use relative paths. Absolute paths " +
      "work for files elsewhere. Parent directories are created automatically. WARNING: this " +
      "replaces the entire file contents — for partial changes to existing files, use edit " +
      "instead (much more token-efficient). Returns the written path and byte count. " +
      "Refuses to write empty content to an existing file.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new WriteParams() as any,
    execute: async ({ args }) => {
      const { path: filePath, content: rawContent } = args as {
        path: string;
        content: string;
      };

      if (!filePath || !filePath.trim()) {
        return { error: "Path must not be empty." };
      }

      const { fullPath, outsideWorkspace } = resolvePath(workspace, filePath);
      const content = sanitizeLlmContent(rawContent, filePath);

      if (!content && existsSync(fullPath)) {
        return {
          error: `Refusing to write empty content to existing file "${filePath}". Use edit to modify files, or provide content for new files.`,
        };
      }

      try {
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, content, "utf-8");
        const result: Record<string, unknown> = {
          success: true,
          path: filePath,
          bytes: Buffer.byteLength(content, "utf-8"),
        };
        if (outsideWorkspace) result.notice = "Operating outside workspace root.";
        if (content !== rawContent) result.sanitized = true;
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: `Failed to write "${filePath}": ${msg}` };
      }
    },
  });
}
