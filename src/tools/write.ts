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

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&#x27;": "'",
  "&#x2F;": "/",
};

const HTML_ENTITY_RE = /&(?:amp|lt|gt|quot|apos|#39|#x27|#x2F);/g;

function hasHtmlEntities(text: string): boolean {
  return HTML_ENTITY_RE.test(text);
}

function unescapeHtmlEntities(text: string): string {
  return text.replace(HTML_ENTITY_RE, (m) => HTML_ENTITIES[m] ?? m);
}

function hasLiteralEscapes(text: string): boolean {
  return text.includes("\\n") && !text.includes("\n");
}

function unescapeLiteralSequences(text: string): string {
  return text.replaceAll("\\n", "\n");
}

/**
 * Detect and repair common LLM garbling patterns in file content:
 * 1. HTML entities (&amp; &lt; &gt;) in non-HTML files
 * 2. Literal \n sequences instead of actual newlines
 */
export function sanitizeLlmContent(content: string, filePath: string): string {
  if (!content || content.length < 2) return content;

  const isHtml = /\.html?$/i.test(filePath);
  let result = content;

  if (!isHtml && hasHtmlEntities(result)) {
    result = unescapeHtmlEntities(result);
  }

  if (hasLiteralEscapes(result)) {
    result = unescapeLiteralSequences(result);
  }

  return result;
}

export function createWriteTool(workspacePath: string) {
  return createTool({
    name: "write",
    description: "Create or overwrite a file. Automatically creates parent directories.",
    // biome-ignore lint: TS index-signature limitation on class instances vs SchemaInstance
    parameters: new WriteParams() as any,
    execute: async ({ args }) => {
      const { path: filePath, content: rawContent } = args as { path: string; content: string };

      if (!isInsideWorkspace(workspacePath, filePath)) {
        return { error: `Access denied: "${filePath}" is outside the workspace.` };
      }

      const content = sanitizeLlmContent(rawContent, filePath);
      const fullPath = join(workspacePath, filePath);

      try {
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, content, "utf-8");
        const result: Record<string, unknown> = {
          success: true,
          path: filePath,
          bytes: Buffer.byteLength(content, "utf-8"),
        };
        if (content !== rawContent) {
          result.sanitized = true;
        }
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: `Failed to write "${filePath}": ${msg}` };
      }
    },
  });
}
