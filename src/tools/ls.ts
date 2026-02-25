import { readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { createTool, Schema } from "chatoyant";
import { isInsideWorkspace } from "../lib/workspace.js";

const MAX_ENTRIES = 500;
const MAX_DEPTH = 5;
const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  "__pycache__",
  ".cache",
  ".turbo",
]);

class LsParams extends Schema {
  path = Schema.String({
    description: "Directory path relative to workspace (default: workspace root)",
    optional: true,
  });
  depth = Schema.Integer({
    description: "Max directory depth to list (default: 2, max: 5)",
    optional: true,
  });
  glob = Schema.String({
    description: 'Filter entries by pattern, e.g. "*.ts" or "*.test.*"',
    optional: true,
  });
}

export interface LsEntry {
  name: string;
  type: "file" | "dir";
  size?: number;
}

function globToRegex(pattern: string): RegExp {
  // Handle brace expansion first: *.{ts,tsx} → *.ts|*.tsx → regex alternation
  const expanded = expandBraces(pattern);
  const alternatives = expanded.map((p) => {
    const escaped = p
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    return escaped;
  });
  const joined = alternatives.length > 1 ? `(?:${alternatives.join("|")})` : alternatives[0]!;
  return new RegExp(`^${joined}$`, "i");
}

function expandBraces(pattern: string): string[] {
  const braceMatch = pattern.match(/^(.*)\{([^}]+)\}(.*)$/);
  if (!braceMatch) return [pattern];
  const [, prefix, inner, suffix] = braceMatch;
  return inner!.split(",").map((alt) => `${prefix}${alt.trim()}${suffix}`);
}

function walkDir(
  basePath: string,
  currentPath: string,
  maxDepth: number,
  currentDepth: number,
  entries: LsEntry[],
  filter: RegExp | null,
): number {
  if (currentDepth > maxDepth || entries.length >= MAX_ENTRIES) return entries.length;

  let items: string[];
  try {
    items = readdirSync(currentPath);
  } catch {
    return entries.length;
  }

  items.sort();

  for (const item of items) {
    if (entries.length >= MAX_ENTRIES) break;

    if (SKIP_DIRS.has(item) && currentDepth === 0) continue;

    const fullPath = join(currentPath, item);
    const relPath = relative(basePath, fullPath);

    let stat: ReturnType<typeof statSync> | null;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    const isDir = stat.isDirectory();

    if (isDir && SKIP_DIRS.has(item)) continue;

    if (filter) {
      if (isDir) {
        walkDir(basePath, fullPath, maxDepth, currentDepth + 1, entries, filter);
        continue;
      }
      if (!filter.test(item)) continue;
    }

    entries.push({
      name: relPath,
      type: isDir ? "dir" : "file",
      ...(isDir ? {} : { size: stat.size }),
    });

    if (isDir && currentDepth < maxDepth) {
      walkDir(basePath, fullPath, maxDepth, currentDepth + 1, entries, filter);
    }
  }

  return entries.length;
}

export function createLsTool(workspacePath: string) {
  return createTool({
    name: "ls",
    description:
      "List directory contents with structured output. " +
      "Returns file/directory names, types, and sizes. " +
      "Use this for workspace orientation instead of bash ls/find.",
    // biome-ignore lint: TS index-signature limitation on class instances vs SchemaInstance
    parameters: new LsParams() as any,
    execute: async ({ args }) => {
      const {
        path: dirPath,
        depth: depthArg,
        glob,
      } = args as {
        path?: string;
        depth?: number;
        glob?: string;
      };

      const targetPath = dirPath || ".";
      if (targetPath !== "." && !isInsideWorkspace(workspacePath, targetPath)) {
        return { error: `Access denied: "${targetPath}" is outside the workspace.` };
      }

      const fullPath = resolve(workspacePath, targetPath);
      const depth = Math.max(0, Math.min(depthArg && depthArg > 0 ? depthArg : 2, MAX_DEPTH));

      let stat: ReturnType<typeof statSync>;
      try {
        stat = statSync(fullPath);
      } catch {
        return { error: `Path not found: "${targetPath}"` };
      }

      if (!stat.isDirectory()) {
        return { error: `"${targetPath}" is a file, not a directory. Use read to view files.` };
      }

      const filter = glob ? globToRegex(glob) : null;
      const entries: LsEntry[] = [];
      walkDir(fullPath, fullPath, depth, 0, entries, filter);

      const truncated = entries.length >= MAX_ENTRIES;

      return {
        entries,
        total: entries.length,
        ...(truncated ? { truncated: true } : {}),
      };
    },
  });
}
