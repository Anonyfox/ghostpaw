import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createTool, Schema } from "chatoyant";
import { findAndReplace } from "../lib/diff.js";
import { isInsideWorkspace } from "../lib/workspace.js";
import { sanitizeLlmContent } from "./write.js";

class EditParams extends Schema {
  path = Schema.String({ description: "File path relative to workspace" });
  search = Schema.String({
    description:
      "Exact string to find (must be unique in the file). Omit when using insertAfterLine.",
    optional: true,
  });
  replacement = Schema.String({
    description: "Replacement string. Omit when using insertAfterLine.",
    optional: true,
  });
  replaceAll = Schema.Boolean({
    description: "Replace ALL occurrences instead of requiring uniqueness (default: false)",
    optional: true,
  });
  insertAfterLine = Schema.Integer({
    description:
      "Insert content after this line number (0 = beginning of file). Alternative to search/replace.",
    optional: true,
  });
  content = Schema.String({
    description: "Text to insert (used with insertAfterLine)",
    optional: true,
  });
  edits = Schema.String({
    description:
      'JSON array of edits: [{"search":"old","replacement":"new"}, ...]. Apply multiple edits atomically.',
    optional: true,
  });
}

interface EditEntry {
  search: string;
  replacement: string;
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
  content: string,
  edits: EditEntry[],
  filePath: string,
): { validatedContent: string; kinds: ("exact" | "fuzzy")[] } | { error: string } {
  let working = content;
  const kinds: ("exact" | "fuzzy")[] = [];

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

export function createEditTool(workspacePath: string) {
  return createTool({
    name: "edit",
    description:
      "Edit a file: search-and-replace (single or batch), insert at line, or replace-all. " +
      "Prefer this over write for modifying existing files — much more token-efficient. " +
      "For batch edits, pass a JSON array in the edits parameter.",
    // biome-ignore lint: TS index-signature limitation on class instances vs SchemaInstance
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

      if (!isInsideWorkspace(workspacePath, filePath)) {
        return { error: `Access denied: "${filePath}" is outside the workspace.` };
      }

      const fullPath = join(workspacePath, filePath);

      let fileContent: string;
      try {
        fileContent = readFileSync(fullPath, "utf-8");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: `Failed to read "${filePath}": ${msg}` };
      }

      const originalSize = fileContent.length;

      // ── Mode: insert after line ──────────────────────────────────
      // Guard: Schema defaults omitted integers to 0, which collides with
      // "insert at beginning." Require `content` parameter as the explicit
      // signal for insert mode — this prevents misrouted search-and-replace
      // calls from accidentally triggering insert.
      const hasInsert =
        typeof insertContent === "string" &&
        typeof insertAfterLine === "number" &&
        insertAfterLine >= 0;
      if (hasInsert) {
        const text = insertContent;
        if (!text) {
          return { error: "Nothing to insert: provide content or replacement." };
        }

        const cleanText = sanitizeLlmContent(text, filePath);
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
        if (notice) result.notice = notice;
        return result;
      }

      // ── Mode: batch edits ────────────────────────────────────────
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

        if (validated.validatedContent.length < originalSize * 0.5 && originalSize > 100) {
          result.warning = `File shrank from ${originalSize} to ${validated.validatedContent.length} chars (>${50}% reduction). Verify the edits are correct.`;
        }

        writeFileSync(fullPath, validated.validatedContent, "utf-8");
        return result;
      }

      // ── Mode: single edit (search + replacement required) ────────
      if (!search) {
        return {
          error:
            "Missing parameters. Provide: (1) search + replacement for single edit, (2) edits for batch, or (3) insertAfterLine + content for insert.",
        };
      }

      const cleanSearch = sanitizeLlmContent(search, filePath);
      const cleanReplacement = sanitizeLlmContent(replacement ?? "", filePath);

      if (cleanSearch === cleanReplacement) {
        return { error: "search and replacement are identical — nothing to do." };
      }

      // ── Mode: replace all ──────────────────────────────────
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

        if (newContent.length < originalSize * 0.5 && originalSize > 100) {
          result.warning = `File shrank from ${originalSize} to ${newContent.length} chars (>${50}% reduction). Verify the replacement is correct.`;
        }

        writeFileSync(fullPath, newContent, "utf-8");
        return result;
      }

      // ── Mode: single unique replace (original behavior) ──────────
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

        if (result.newContent.length < originalSize * 0.5 && originalSize > 100) {
          response.warning = `File shrank from ${originalSize} to ${result.newContent.length} chars (>${50}% reduction). Verify the edit is correct.`;
        }

        writeFileSync(fullPath, result.newContent, "utf-8");
        return response;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: msg };
      }
    },
  });
}
