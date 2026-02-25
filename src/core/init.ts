import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { commitSkills, initHistory } from "../lib/skill-history.js";
import { blank, log, readSecret, style } from "../lib/terminal.js";
import { DEFAULT_CONFIG } from "./config.js";
import { SKILL_CRAFT, SKILL_MCP, SKILL_SCOUT, SKILL_TRAINING } from "./default_skills.js";
import { SOUL_ENGINEER } from "./default_souls.js";
import { KNOWN_KEYS, type KnownKey, type SecretStore } from "./secrets.js";
import { DEFAULT_SOUL } from "./soul.js";

export interface InitResult {
  created: string[];
  skipped: string[];
}

const LLM_PROVIDERS = KNOWN_KEYS.filter((k) => k.category === "llm");
const SEARCH_PROVIDERS = KNOWN_KEYS.filter((k) => k.category === "search");

/**
 * Checks whether workspace has the minimum viable setup (config + API key).
 * If not, silently scaffolds files and — when running in a TTY — prompts for
 * an API key. Called automatically before REPL/daemon/run so `ghostpaw init`
 * is never required as a separate step.
 */
export async function ensureWorkspace(workspacePath: string): Promise<void> {
  const configPath = join(workspacePath, "config.json");
  const needsScaffold = !existsSync(configPath);

  if (needsScaffold) {
    blank();
    log.info("First run — setting up workspace");
    blank();
    const result = initWorkspace(workspacePath);
    for (const p of result.created) log.created(relPath(workspacePath, p));
    for (const p of result.skipped) log.exists(relPath(workspacePath, p));
    blank();
  }

  await ensureApiKey(workspacePath);
}

function relPath(base: string, full: string): string {
  if (full.startsWith(base)) {
    const rel = full.slice(base.length).replace(/^\//, "");
    return rel || basename(full);
  }
  return full;
}

const GITIGNORE_ENTRIES = ["ghostpaw.db", "ghostpaw.db-wal", "ghostpaw.db-shm", ".ghostpaw/"];

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

export function buildConfigTemplate(): string {
  return JSON.stringify(
    {
      models: DEFAULT_CONFIG.models,
      costControls: DEFAULT_CONFIG.costControls,
    },
    null,
    2,
  );
}

function updateGitignore(workspacePath: string, result: InitResult): void {
  const gitignorePath = join(workspacePath, ".gitignore");
  const existing = existsSync(gitignorePath) ? readFileSync(gitignorePath, "utf-8") : "";

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
  writeIfMissing(join(workspacePath, "SOUL.md"), `${DEFAULT_SOUL}\n`, result);
  writeIfMissing(join(workspacePath, "config.json"), `${buildConfigTemplate()}\n`, result);
  writeIfMissing(join(workspacePath, "agents", "js-engineer.md"), `${SOUL_ENGINEER}\n`, result);
  writeIfMissing(join(workspacePath, "skills", "skill-craft.md"), `${SKILL_CRAFT}\n`, result);
  writeIfMissing(join(workspacePath, "skills", "skill-training.md"), `${SKILL_TRAINING}\n`, result);
  writeIfMissing(join(workspacePath, "skills", "skill-scout.md"), `${SKILL_SCOUT}\n`, result);
  writeIfMissing(join(workspacePath, "skills", "skill-mcp.md"), `${SKILL_MCP}\n`, result);
  updateGitignore(workspacePath, result);

  if (initHistory(workspacePath)) {
    commitSkills(workspacePath, "initial skills");
  }

  return result;
}

// ── API key detection ───────────────────────────────────────────────────────

function hasAnyLlmKey(): boolean {
  return LLM_PROVIDERS.some((k) => {
    if (process.env[k.canonical]) return true;
    return k.aliases.some((a) => process.env[a]);
  });
}

function findConfiguredLlm(secrets: SecretStore): KnownKey | null {
  for (const k of LLM_PROVIDERS) {
    if (secrets.get(k.canonical) !== null) return k;
    for (const alias of k.aliases) {
      if (process.env[alias]) return k;
    }
  }
  return null;
}

function findConfiguredSearch(secrets: SecretStore): KnownKey | null {
  for (const k of SEARCH_PROVIDERS) {
    if (secrets.get(k.canonical) !== null) return k;
  }
  return null;
}

// ── Interactive helpers ─────────────────────────────────────────────────────

async function askQuestion(prompt: string): Promise<string> {
  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(prompt);
  } finally {
    rl.close();
  }
}

async function askKeyFromList(
  secrets: SecretStore,
  providers: KnownKey[],
  hint?: string,
): Promise<boolean> {
  for (let i = 0; i < providers.length; i++) {
    console.log(`  ${style.bold(`${i + 1}`)}  ${providers[i]!.label}`);
  }
  if (hint) console.log(`  ${style.dim(hint)}`);

  const range = providers.length === 1 ? "[1]" : `[1-${providers.length}]`;
  const choice = await askQuestion(`\n  Provider ${style.dim(range)}: `);
  const idx = parseInt(choice, 10);
  if (!(idx >= 1 && idx <= providers.length)) return false;

  const provider = providers[idx - 1]!;
  const key = await readSecret(`  ${provider.label} API key: `);
  if (!key) {
    blank();
    log.warn("Empty key, skipping");
    return false;
  }

  const result = secrets.set(provider.canonical, key);
  if (!result.value) {
    blank();
    log.warn(result.warning ?? "Empty value");
    return false;
  }
  if (result.warning) log.warn(result.warning);
  blank();
  log.done(`${provider.label} key stored`);
  return true;
}

// ── ensureApiKey (auto-called before REPL/daemon/run) ───────────────────────

async function ensureApiKey(workspacePath: string): Promise<void> {
  if (hasAnyLlmKey()) return;

  const { createDatabase } = await import("./database.js");
  const { createSecretStore } = await import("./secrets.js");

  const db = await createDatabase(resolve(workspacePath, "ghostpaw.db"));
  try {
    const secrets = createSecretStore(db);
    secrets.loadIntoEnv();

    if (findConfiguredLlm(secrets)) return;

    if (!process.stdin.isTTY) {
      log.error("No API key configured.");
      console.error("  Set an environment variable (e.g. ANTHROPIC_API_KEY)");
      console.error("  or run ghostpaw in a terminal for interactive setup.");
      process.exit(1);
    }

    log.info("No API key found — let's set one up");
    blank();

    try {
      await askKeyFromList(secrets, LLM_PROVIDERS);
      secrets.loadIntoEnv();
    } catch {
      process.exit(0);
    }
    blank();
  } finally {
    db.close();
  }
}

// ── promptApiKey (called by `ghostpaw init`) ────────────────────────────────

export async function promptApiKey(workspacePath: string): Promise<void> {
  if (!process.stdin.isTTY) return;

  const { createDatabase } = await import("./database.js");
  const { createSecretStore } = await import("./secrets.js");

  const db = await createDatabase(resolve(workspacePath, "ghostpaw.db"));
  const secrets = createSecretStore(db);

  try {
    // LLM provider
    const existingLlm = findConfiguredLlm(secrets);
    if (existingLlm) {
      blank();
      log.info(`LLM key configured: ${existingLlm.label}`);
      const answer = await askQuestion(`  Change it? ${style.dim("[y/N]")}: `);
      if (answer.trim().toLowerCase() === "y") {
        blank();
        await askKeyFromList(secrets, LLM_PROVIDERS);
      }
    } else {
      blank();
      log.info("No LLM key found — let's set one up");
      blank();
      await askKeyFromList(secrets, LLM_PROVIDERS);
    }

    // Search provider (optional)
    const existingSearch = findConfiguredSearch(secrets);
    if (existingSearch) {
      blank();
      log.info(`Search key configured: ${existingSearch.label}`);
      const answer = await askQuestion(`  Change it? ${style.dim("[y/N]")}: `);
      if (answer.trim().toLowerCase() === "y") {
        blank();
        await askKeyFromList(secrets, SEARCH_PROVIDERS);
      }
    } else {
      blank();
      log.info(`Search provider ${style.dim("(optional, improves web search reliability)")}`);
      blank();
      await askKeyFromList(secrets, SEARCH_PROVIDERS, "↵  skip");
    }
  } catch {
    // Ctrl+C or closed stdin
  } finally {
    db.close();
  }
}
