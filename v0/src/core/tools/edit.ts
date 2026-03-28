import { readFileSync, writeFileSync } from "node:fs";
import { createTool, Schema } from "chatoyant";
import type { ReplaceResult } from "./find_and_replace.ts";
import { findAndReplace } from "./find_and_replace.ts";
import { resolvePath } from "./resolve_path.ts";
import { sanitizeLlmContent } from "./sanitize_llm_content.ts";

class EditParams extends Schema {
  path = Schema.String({
    description: "File path, relative to workspace root or absolute.",
  });
  search = Schema.String({
    description:
      "Exact string to find in the file (must appear exactly once). " +
      "Include enough surrounding context to ensure uniqueness. Omit when using insertAfterLine.",
    optional: true,
  });
  replacement = Schema.String({
    description:
      "String to replace the search match with. Use empty string to delete. Omit for insert mode.",
    optional: true,
  });
  replaceAll = Schema.Boolean({
    description:
      "Replace ALL occurrences of search instead of requiring uniqueness (default: false)",
    optional: true,
  });
  insertAfterLine = Schema.Integer({
    description:
      "Insert content after this line number (0 = beginning of file). " +
      "Requires the 'content' parameter. Alternative to search/replace.",
    optional: true,
  });
  content = Schema.String({
    description: "Text to insert when using insertAfterLine mode",
    optional: true,
  });
  edits = Schema.String({
    description:
      'JSON array for batch edits: [{"search":"old","replacement":"new"}, ...]. ' +
      "All edits are validated before any are applied — atomic.",
    optional: true,
  });
}

interface EditEntry {
  search: string;
  replacement: string;
}

function shrinkWarning(originalSize: number, newSize: number): string | undefined {
  if (newSize < originalSize * 0.5 && originalSize > 100) {
    return `File shrank from ${originalSize} to ${newSize} chars (>50% reduction). Verify the edit is correct.`;
  }
  return undefined;
}

function parseEdits(raw: string): EditEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("edits must be a valid JSON array");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("edits must be a non-empty JSON array");
  }
  const result: EditEntry[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.search !== "string" ||
      typeof item.replacement !== "string"
    ) {
      throw new Error(`edits[${i}] must have "search" (string) and "replacement" (string) fields`);
    }
    result.push({ search: item.search, replacement: item.replacement });
  }
  return result;
}

function validateAllEdits(
  fileContent: string,
  edits: EditEntry[],
  filePath: string,
): { validatedContent: string; kinds: ReplaceResult["matchKind"][] } | { error: string } {
  let working = fileContent;
  const kinds: ReplaceResult["matchKind"][] = [];

  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i]!;
    const cleanSearch = sanitizeLlmContent(edit.search, filePath);
    const cleanReplacement = sanitizeLlmContent(edit.replacement, filePath);

    if (cleanSearch === cleanReplacement) {
      return { error: `edits[${i}]: search and replacement are identical — nothing to do.` };
    }

    try {
      const result = findAndReplace(working, cleanSearch, cleanReplacement);
      working = result.newContent;
      kinds.push(result.matchKind);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: `edits[${i}]: ${msg}` };
    }
  }

  return { validatedContent: working, kinds };
}

export function createEditTool(workspace: string) {
  return createTool({
    name: "edit",
    description:
      "Edit a file. Prefers workspace — use relative paths. Absolute paths work for files " +
      "elsewhere. Three modes — choose ONE per call: " +
      "(A) search + replacement: find an exact string and replace it (must be unique in the file). " +
      "(B) edits: JSON array for batch replacements, applied atomically. " +
      "(C) insertAfterLine + content: insert text after a specific line number (0 = beginning). " +
      "Much more token-efficient than rewriting the whole file with 'write'. " +
      "Set replaceAll=true in mode A to replace every occurrence instead of requiring uniqueness.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new EditParams() as any,
    execute: async ({ args }) => {
      const {
        path: filePath,
        search,
        replacement,
        replaceAll: replaceAllFlag,
        insertAfterLine,
        content: insertContent,
        edits: editsRaw,
      } = args as {
        path: string;
        search?: string;
        replacement?: string;
        replaceAll?: boolean;
        insertAfterLine?: number;
        content?: string;
        edits?: string;
      };

      if (!filePath || !filePath.trim()) {
        return { error: "Path must not be empty." };
      }

      const { fullPath, outsideWorkspace } = resolvePath(workspace, filePath);

      let fileContent: string;
      try {
        fileContent = readFileSync(fullPath, "utf-8");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: `Failed to read "${filePath}": ${msg}` };
      }

      const originalSize = fileContent.length;

      const hasInsert =
        typeof insertContent === "string" &&
        typeof insertAfterLine === "number" &&
        insertAfterLine >= 0;
      if (hasInsert) {
        if (!insertContent) {
          return { error: "Nothing to insert: provide content or replacement." };
        }
        const cleanText = sanitizeLlmContent(insertContent, filePath);
        const lines = fileContent.split("\n");
        const totalLines = lines.length;
        const clampedLine = Math.min(insertAfterLine, totalLines);
        const notice =
          clampedLine !== insertAfterLine
            ? `Line ${insertAfterLine} exceeds file length (${totalLines} lines), inserted at end.`
            : undefined;
        lines.splice(clampedLine, 0, ...cleanText.split("\n"));
        const newContent = lines.join("\n");
        if (newContent.length === 0) {
          return { error: "Insert would result in an empty file. Aborting." };
        }
        writeFileSync(fullPath, newContent, "utf-8");
        const result: Record<string, unknown> = {
          success: true,
          path: filePath,
          insertedAtLine: clampedLine,
          linesInserted: cleanText.split("\n").length,
        };
        if (outsideWorkspace) result.notice = "Operating outside workspace root.";
        else if (notice) result.notice = notice;
        return result;
      }

      if (editsRaw) {
        let edits: EditEntry[];
        try {
          edits = parseEdits(editsRaw);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return { error: msg };
        }
        const validated = validateAllEdits(fileContent, edits, filePath);
        if ("error" in validated) return { error: validated.error };
        if (validated.validatedContent.length === 0) {
          return { error: "Batch edits would result in an empty file. Aborting." };
        }
        const result: Record<string, unknown> = {
          success: true,
          path: filePath,
          editsApplied: edits.length,
          matchKinds: validated.kinds,
        };
        if (outsideWorkspace) result.notice = "Operating outside workspace root.";
        const warning = shrinkWarning(originalSize, validated.validatedContent.length);
        if (warning) result.warning = warning;
        writeFileSync(fullPath, validated.validatedContent, "utf-8");
        return result;
      }

      if (!search) {
        return {
          error:
            "Missing parameters. Provide: (1) search + replacement for single edit, " +
            "(2) edits for batch, or (3) insertAfterLine + content for insert.",
        };
      }

      const cleanSearch = sanitizeLlmContent(search, filePath);
      const cleanReplacement = sanitizeLlmContent(replacement ?? "", filePath);

      if (cleanSearch === cleanReplacement) {
        return { error: "search and replacement are identical — nothing to do." };
      }

      if (replaceAllFlag) {
        const count = fileContent.split(cleanSearch).length - 1;
        if (count === 0) {
          return { error: "Search string not found in file content." };
        }
        const newContent = fileContent.replaceAll(cleanSearch, cleanReplacement);
        if (newContent.length === 0) {
          return { error: "Replace-all would result in an empty file. Aborting." };
        }
        const result: Record<string, unknown> = {
          success: true,
          path: filePath,
          replacements: count,
        };
        if (outsideWorkspace) result.notice = "Operating outside workspace root.";
        const warning = shrinkWarning(originalSize, newContent.length);
        if (warning) result.warning = warning;
        writeFileSync(fullPath, newContent, "utf-8");
        return result;
      }

      try {
        const result = findAndReplace(fileContent, cleanSearch, cleanReplacement);
        if (result.newContent.length === 0) {
          return { error: "Edit would result in an empty file. Aborting." };
        }
        const response: Record<string, unknown> = {
          success: true,
          matchKind: result.matchKind,
          path: filePath,
        };
        if (outsideWorkspace) response.notice = "Operating outside workspace root.";
        const warning = shrinkWarning(originalSize, result.newContent.length);
        if (warning) response.warning = warning;
        writeFileSync(fullPath, result.newContent, "utf-8");
        return response;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: msg };
      }
    },
  });
}
