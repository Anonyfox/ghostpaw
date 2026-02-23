import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DEFAULT_CONFIG } from "./config.js";
import { DEFAULT_SOUL } from "./soul.js";

export interface InitResult {
  created: string[];
  skipped: string[];
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
  updateGitignore(workspacePath, result);

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
    console.log(`  ${i + 1}. ${PROVIDERS[i].label}`);
  }

  const choice = await rl.question("\nWhich provider? [1/2/3]: ");
  const idx = parseInt(choice, 10);
  if (!(idx >= 1 && idx <= PROVIDERS.length)) {
    console.log("Invalid choice, skipping. You can set a key later via environment variable.");
    return;
  }

  const provider = PROVIDERS[idx - 1];
  const key = await rl.question(`${provider.label} API key: `);
  if (!key.trim()) {
    console.log("Empty key, skipping.");
    return;
  }

  secrets.set(provider.envKey, key.trim());
  console.log(`Stored ${provider.label} key.`);
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
        console.log(`\nAPI key configured: ${existing.label}`);
        const answer = await rl.question("Change it? [y/N]: ");
        if (answer.trim().toLowerCase() !== "y") return;
        console.log("");
      } else {
        console.log("\nNo API key found. Let's set one up.\n");
      }

      await askProviderAndKey(rl, secrets);
    } catch {
      // Ctrl+C or closed stdin — exit silently
    } finally {
      rl.close();
    }
  } finally {
    db.close();
  }
}
