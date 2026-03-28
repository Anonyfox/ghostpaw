import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createTool, Schema } from "chatoyant";
import { resolvePath } from "./resolve_path.ts";

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
    description: "Directory path, relative to workspace root or absolute. Omit for workspace root.",
    optional: true,
  });
  depth = Schema.Integer({
    description:
      "Max directory depth to recurse into (default: 2, max: 5). Use 0 for top-level only.",
    optional: true,
  });
  glob = Schema.String({
    description:
      'Filter files by name pattern, e.g. "*.ts" or "*.{ts,tsx}". Directories are still traversed but not listed unless they match.',
    optional: true,
  });
}

export interface LsEntry {
  name: string;
  type: "file" | "dir";
  size?: number;
}

function expandBraces(pattern: string): string[] {
  const braceMatch = pattern.match(/^(.*)\{([^}]+)\}(.*)$/);
  if (!braceMatch) return [pattern];
  const [, prefix, inner, suffix] = braceMatch;
  return inner!.split(",").map((alt) => `${prefix}${alt.trim()}${suffix}`);
}

function globToRegex(pattern: string): RegExp {
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

function walkDir(
  basePath: string,
  currentPath: string,
  maxDepth: number,
  currentDepth: number,
  entries: LsEntry[],
  filter: RegExp | null,
): void {
  if (currentDepth > maxDepth || entries.length >= MAX_ENTRIES) return;

  let items: string[];
  try {
    items = readdirSync(currentPath);
  } catch {
    return;
  }

  items.sort();

  for (const item of items) {
    if (entries.length >= MAX_ENTRIES) break;

    const fullPath = join(currentPath, item);
    let stat: ReturnType<typeof statSync> | null;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    const isDir = stat.isDirectory();
    if (isDir && SKIP_DIRS.has(item)) continue;

    const relPath = relative(basePath, fullPath);

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
}

export function createLsTool(workspace: string) {
  return createTool({
    name: "ls",
    description:
      "List directory contents. Defaults to workspace root. Returns structured entries with " +
      "name, type (file/dir), and size (bytes, files only). Recurses into subdirectories up to " +
      "the specified depth. Automatically skips noise directories (.git, node_modules, dist, etc.). " +
      "Use this for orientation before reading or editing files. For content search, use grep.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
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
      const { fullPath } = resolvePath(workspace, targetPath);
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
      const result: Record<string, unknown> = {
        entries,
        total: entries.length,
      };
      if (truncated) result.truncated = true;
      return result;
    },
  });
}
