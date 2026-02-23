import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { createTool, Schema } from "chatoyant";

class WriteParams extends Schema {
  path = Schema.String({ description: "File path relative to workspace" });
  content = Schema.String({ description: "File content to write" });
}

function isInsideWorkspace(workspacePath: string, filePath: string): boolean {
  const resolved = resolve(workspacePath, filePath);
  return !relative(workspacePath, resolved).startsWith("..");
}

export function createWriteTool(workspacePath: string) {
  return createTool({
    name: "write",
    description: "Create or overwrite a file. Automatically creates parent directories.",
    // biome-ignore lint: TS index-signature limitation on class instances vs SchemaInstance
    parameters: new WriteParams() as any,
    execute: async ({ args }) => {
      const { path: filePath, content } = args as { path: string; content: string };

      if (!isInsideWorkspace(workspacePath, filePath)) {
        return { error: `Access denied: "${filePath}" is outside the workspace.` };
      }

      const fullPath = join(workspacePath, filePath);

      try {
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, content, "utf-8");
        return { success: true, path: filePath, bytes: Buffer.byteLength(content, "utf-8") };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: `Failed to write "${filePath}": ${msg}` };
      }
    },
  });
}
