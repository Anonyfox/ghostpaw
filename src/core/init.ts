import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { DEFAULT_CONFIG } from "./config.js";
import { SKILL_CRAFT, SKILL_TRAINING } from "./default_skills.js";
import { DEFAULT_SOUL } from "./soul.js";
import { commitSkills, initHistory } from "../lib/skill-history.js";
import { blank, log, style } from "../lib/terminal.js";

export interface InitResult {
  created: string[];
  skipped: string[];
}

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

const PROVIDERS = [
  { label: "Anthropic", envKey: "API_KEY_ANTHROPIC" },
  { label: "OpenAI", envKey: "API_KEY_OPENAI" },
  { label: "xAI", envKey: "API_KEY_XAI" },
] as const;

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
  writeIfMissing(join(workspacePath, "skills", "skill-craft.md"), `${SKILL_CRAFT}\n`, result);
  writeIfMissing(join(workspacePath, "skills", "skill-training.md"), `${SKILL_TRAINING}\n`, result);
  updateGitignore(workspacePath, result);

  // Initialize skill history tracking (git-based, in .ghostpaw/skill-history/)
  if (initHistory(workspacePath)) {
    commitSkills(workspacePath, "initial skills");
  }

  return result;
}

const ENV_KEYS_TO_CHECK = [
  "API_KEY_ANTHROPIC",
  "ANTHROPIC_API_KEY",
  "API_KEY_OPENAI",
  "OPENAI_API_KEY",
  "API_KEY_XAI",
  "XAI_API_KEY",
];

function hasAnyApiKey(): boolean {
  return ENV_KEYS_TO_CHECK.some((k) => process.env[k] !== undefined && process.env[k] !== "");
}

async function ensureApiKey(workspacePath: string): Promise<void> {
  if (hasAnyApiKey()) return;

  const { createDatabase } = await import("./database.js");
  const { createSecretStore } = await import("./secrets.js");

  const db = await createDatabase(resolve(workspacePath, "ghostpaw.db"));
  try {
    const secrets = createSecretStore(db);
    secrets.loadIntoEnv();

    if (findConfiguredProvider(secrets)) return;

    if (!process.stdin.isTTY) {
      log.error("No API key configured.");
      console.error("  Set an environment variable (e.g. ANTHROPIC_API_KEY)");
      console.error("  or run ghostpaw in a terminal for interactive setup.");
      process.exit(1);
    }

    log.info("No API key found — let's set one up");
    blank();

    const { createInterface } = await import("node:readline/promises");
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      await askProviderAndKey(rl, secrets);
      secrets.loadIntoEnv();
    } catch {
      process.exit(0);
    } finally {
      rl.close();
    }
    blank();
  } finally {
    db.close();
  }
}

function findConfiguredProvider(
  secrets: import("./secrets.js").SecretStore,
): (typeof PROVIDERS)[number] | null {
  for (const p of PROVIDERS) {
    if (secrets.get(p.envKey) !== null) return p;
  }
  for (const k of ENV_KEYS_TO_CHECK) {
    if (process.env[k] !== undefined && process.env[k] !== "") {
      const match = PROVIDERS.find((p) => p.envKey === k || ENV_KEYS_TO_CHECK.indexOf(k) % 2 === 0);
      if (match) return match;
    }
  }
  return null;
}

async function askProviderAndKey(
  rl: import("node:readline/promises").Interface,
  secrets: import("./secrets.js").SecretStore,
): Promise<void> {
  for (let i = 0; i < PROVIDERS.length; i++) {
    console.log(`  ${style.bold(`${i + 1}`)}  ${PROVIDERS[i].label}`);
  }

  const choice = await rl.question(`\n  Provider ${style.dim("[1/2/3]")}: `);
  const idx = parseInt(choice, 10);
  if (!(idx >= 1 && idx <= PROVIDERS.length)) {
    blank();
    log.warn("Skipped — set a key later via environment variable or re-run ghostpaw");
    return;
  }

  const provider = PROVIDERS[idx - 1];
  const key = await rl.question(`  ${provider.label} API key: `);
  if (!key.trim()) {
    blank();
    log.warn("Empty key, skipping");
    return;
  }

  secrets.set(provider.envKey, key.trim());
  blank();
  log.done(`${provider.label} key stored`);
}

export async function promptApiKey(workspacePath: string): Promise<void> {
  if (!process.stdin.isTTY) return;

  const { createDatabase } = await import("./database.js");
  const { createSecretStore } = await import("./secrets.js");

  const db = await createDatabase(resolve(workspacePath, "ghostpaw.db"));
  const secrets = createSecretStore(db);

  try {
    const { createInterface } = await import("node:readline/promises");
    const rl = createInterface({ input: process.stdin, output: process.stdout });

    try {
      const existing = findConfiguredProvider(secrets);

      if (existing) {
        blank();
        log.info(`API key configured: ${existing.label}`);
        const answer = await rl.question(`  Change it? ${style.dim("[y/N]")}: `);
        if (answer.trim().toLowerCase() !== "y") return;
        blank();
      } else {
        blank();
        log.info("No API key found — let's set one up");
        blank();
      }

      await askProviderAndKey(rl, secrets);
    } catch {
      // Ctrl+C or closed stdin
    } finally {
      rl.close();
    }
  } finally {
    db.close();
  }
}
