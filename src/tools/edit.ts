import { readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { createTool, Schema } from "chatoyant";
import { findAndReplace } from "../lib/diff.js";

class EditParams extends Schema {
  path = Schema.String({ description: "File path relative to workspace" });
  search = Schema.String({ description: "Exact string to find (must be unique in the file)" });
  replacement = Schema.String({ description: "Replacement string" });
}

function isInsideWorkspace(workspacePath: string, filePath: string): boolean {
  const resolved = resolve(workspacePath, filePath);
  return !relative(workspacePath, resolved).startsWith("..");
}

export function createEditTool(workspacePath: string) {
  return createTool({
    name: "edit",
    description:
      "Find a unique string in a file and replace it. The search string must match exactly one location. " +
      "Falls back to whitespace-normalized fuzzy matching if exact match fails.",
    // biome-ignore lint: TS index-signature limitation on class instances vs SchemaInstance
    parameters: new EditParams() as any,
    execute: async ({ args }) => {
      const {
        path: filePath,
        search,
        replacement,
      } = args as {
        path: string;
        search: string;
        replacement: string;
      };

      if (!isInsideWorkspace(workspacePath, filePath)) {
        return { error: `Access denied: "${filePath}" is outside the workspace.` };
      }

      const fullPath = join(workspacePath, filePath);

      let content: string;
      try {
        content = readFileSync(fullPath, "utf-8");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: `Failed to read "${filePath}": ${msg}` };
      }

      try {
        const result = findAndReplace(content, search, replacement);
        writeFileSync(fullPath, result.newContent, "utf-8");
        return { success: true, matchKind: result.matchKind, path: filePath };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: msg };
      }
    },
  });
}
