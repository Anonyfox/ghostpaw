import { execFileSync } from "node:child_process";
import { relative, resolve } from "node:path";
import { createTool, Schema } from "chatoyant";
import { isInsideWorkspace } from "../lib/workspace.js";

const DEFAULT_MAX_RESULTS = 20;
const MAX_OUTPUT_BYTES = 200_000;
const EXCLUDE_DIRS = [".git", "node_modules", ".next", "dist", "build", "coverage", "__pycache__"];

class GrepParams extends Schema {
  pattern = Schema.String({ description: "Search pattern (regex supported)" });
  path = Schema.String({
    description: "File or directory to search in, relative to workspace (default: workspace root)",
    optional: true,
  });
  glob = Schema.String({
    description: 'File filter glob, e.g. "*.ts" or "*.{js,mjs}"',
    optional: true,
  });
  contextLines = Schema.Integer({
    description: "Lines of context around each match (like grep -C)",
    optional: true,
  });
  maxResults = Schema.Integer({
    description: `Maximum matches to return (default: ${DEFAULT_MAX_RESULTS})`,
    optional: true,
  });
}

export interface GrepMatch {
  file: string;
  line: number;
  content: string;
  context?: string[];
}

let hasRg: boolean | undefined;

function detectRg(): boolean {
  if (hasRg !== undefined) return hasRg;
  try {
    execFileSync("rg", ["--version"], { stdio: "pipe", timeout: 3000 });
    hasRg = true;
  } catch {
    hasRg = false;
  }
  return hasRg;
}

function buildRgArgs(
  pattern: string,
  searchPath: string,
  glob: string | undefined,
  contextLines: number | undefined,
  maxResults: number,
): string[] {
  // --max-count is per-file, so use a conservative per-file limit
  // combined with our post-process grouping cap
  const perFileMax = Math.min(maxResults, 10);
  const args = [
    "--line-number",
    "--no-heading",
    "--color=never",
    "--max-count",
    String(perFileMax),
  ];
  for (const dir of EXCLUDE_DIRS) args.push("--glob", `!${dir}`);
  if (glob) args.push("--glob", glob);
  if (contextLines && contextLines > 0) args.push(`-C`, String(contextLines));
  args.push("--", pattern, searchPath);
  return args;
}

function buildGrepArgs(
  pattern: string,
  searchPath: string,
  glob: string | undefined,
  contextLines: number | undefined,
  maxResults: number,
): string[] {
  const perFileMax = Math.min(maxResults, 10);
  const args = ["-rn", "--color=never", `-m`, String(perFileMax)];
  for (const dir of EXCLUDE_DIRS) args.push(`--exclude-dir=${dir}`);
  if (glob) {
    const globs = glob.replace(/[{}]/g, "").split(",");
    for (const g of globs) args.push(`--include=${g.trim()}`);
  }
  if (contextLines && contextLines > 0) args.push(`-C`, String(contextLines));
  args.push("--", pattern, searchPath);
  return args;
}

interface RawLine {
  file: string;
  line: number;
  content: string;
  isContext: boolean;
}

function parseGrepOutput(raw: string, workspacePath: string): RawLine[] {
  const results: RawLine[] = [];
  for (const line of raw.split("\n")) {
    if (!line || line === "--") continue;

    const sepIdx = line.indexOf(":");
    if (sepIdx === -1) continue;

    const afterFile = line.slice(sepIdx + 1);
    const numSep = afterFile.search(/[:-]/);
    if (numSep === -1) continue;

    const file = relative(workspacePath, resolve(workspacePath, line.slice(0, sepIdx)));
    const lineNum = Number.parseInt(afterFile.slice(0, numSep), 10);
    if (Number.isNaN(lineNum)) continue;

    const isContext = afterFile[numSep] === "-";
    const content = afterFile.slice(numSep + 1);
    results.push({ file, line: lineNum, content, isContext });
  }
  return results;
}

function groupMatches(rawLines: RawLine[], maxResults: number): GrepMatch[] {
  const matches: GrepMatch[] = [];
  let currentMatch: GrepMatch | null = null;

  for (const raw of rawLines) {
    if (!raw.isContext) {
      if (currentMatch) matches.push(currentMatch);
      if (matches.length >= maxResults) break;
      currentMatch = { file: raw.file, line: raw.line, content: raw.content };
    } else if (currentMatch) {
      if (!currentMatch.context) currentMatch.context = [];
      currentMatch.context.push(`${raw.line}:${raw.content}`);
    }
  }
  if (currentMatch && matches.length < maxResults) matches.push(currentMatch);
  return matches;
}

export function createGrepTool(workspacePath: string) {
  return createTool({
    name: "grep",
    description:
      "Search file contents for a pattern. Returns structured matches with file paths and line numbers. " +
      "Use this to locate code before reading files — much more token-efficient than reading entire files.",
    // biome-ignore lint: TS index-signature limitation on class instances vs SchemaInstance
    parameters: new GrepParams() as any,
    execute: async ({ args }) => {
      const {
        pattern,
        path: searchPath,
        glob,
        contextLines,
        maxResults: maxResultsArg,
      } = args as {
        pattern: string;
        path?: string;
        glob?: string;
        contextLines?: number;
        maxResults?: number;
      };

      if (!pattern || pattern.trim().length === 0) {
        return { error: "Pattern cannot be empty." };
      }

      const targetPath = searchPath || ".";
      if (targetPath !== "." && !isInsideWorkspace(workspacePath, targetPath)) {
        return { error: `Access denied: "${targetPath}" is outside the workspace.` };
      }

      const maxResults =
        maxResultsArg && maxResultsArg > 0 ? Math.min(maxResultsArg, 100) : DEFAULT_MAX_RESULTS;

      const fullPath = resolve(workspacePath, targetPath);
      const useRg = detectRg();

      let rawOutput = "";
      try {
        const cmd = useRg ? "rg" : "grep";
        const cmdArgs = useRg
          ? buildRgArgs(pattern, fullPath, glob, contextLines, maxResults)
          : buildGrepArgs(pattern, fullPath, glob, contextLines, maxResults);

        rawOutput = execFileSync(cmd, cmdArgs, {
          cwd: workspacePath,
          encoding: "utf-8",
          timeout: 15_000,
          maxBuffer: MAX_OUTPUT_BYTES,
          stdio: ["pipe", "pipe", "pipe"],
        });
      } catch (err: unknown) {
        const e = err as { status?: number; stdout?: string; stderr?: string };
        if (e.status === 1 && !e.stdout) {
          return { matches: [], totalMatches: 0, truncated: false };
        }
        if (e.stdout) {
          rawOutput = e.stdout;
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          return { error: `Search failed: ${msg}` };
        }
      }

      const rawLines = parseGrepOutput(rawOutput, workspacePath);
      const matches = groupMatches(rawLines, maxResults);
      const totalInOutput = rawLines.filter((r) => !r.isContext).length;

      return {
        matches,
        totalMatches: totalInOutput,
        truncated: totalInOutput > matches.length,
      };
    },
  });
}
