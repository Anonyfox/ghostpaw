import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_SOUL } from "./soul.js";
import { DEFAULT_CONFIG } from "./config.js";

export interface InitResult {
  created: string[];
  skipped: string[];
}

const GITIGNORE_ENTRIES = [
  "ghostpaw.db",
  "ghostpaw.db-wal",
  "ghostpaw.db-shm",
  ".ghostpaw/",
];

function ensureDir(path: string, result: InitResult): void {
  if (existsSync(path)) {
    result.skipped.push(path);
  } else {
    mkdirSync(path, { recursive: true });
    result.created.push(path);
  }
}

function writeIfMissing(path: string, content: string, result: InitResult): void {
  if (existsSync(path)) {
    result.skipped.push(path);
  } else {
    writeFileSync(path, content, "utf-8");
    result.created.push(path);
  }
}

function buildConfigTemplate(): string {
  return JSON.stringify(
    {
      providers: {},
      models: DEFAULT_CONFIG.models,
      costControls: DEFAULT_CONFIG.costControls,
    },
    null,
    2,
  );
}

function updateGitignore(workspacePath: string, result: InitResult): void {
  const gitignorePath = join(workspacePath, ".gitignore");
  const existing = existsSync(gitignorePath)
    ? readFileSync(gitignorePath, "utf-8")
    : "";

  const missing = GITIGNORE_ENTRIES.filter(
    (entry) => !existing.split("\n").some((line) => line.trim() === entry),
  );

  if (missing.length === 0) {
    result.skipped.push(gitignorePath);
    return;
  }

  const block = `\n# ghostpaw\n${missing.join("\n")}\n`;
  if (existsSync(gitignorePath)) {
    appendFileSync(gitignorePath, block, "utf-8");
  } else {
    writeFileSync(gitignorePath, block.trimStart(), "utf-8");
  }
  result.created.push(gitignorePath);
}

export function initWorkspace(workspacePath: string): InitResult {
  const result: InitResult = { created: [], skipped: [] };

  ensureDir(join(workspacePath, "agents"), result);
  ensureDir(join(workspacePath, "skills"), result);
  ensureDir(join(workspacePath, ".ghostpaw"), result);
  writeIfMissing(join(workspacePath, "SOUL.md"), DEFAULT_SOUL + "\n", result);
  writeIfMissing(join(workspacePath, "config.json"), buildConfigTemplate() + "\n", result);
  updateGitignore(workspacePath, result);

  return result;
}
