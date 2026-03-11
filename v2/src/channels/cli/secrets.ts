import { defineCommand } from "citty";
import { canonicalKeyName } from "../../core/secrets/api/read/index.ts";
import { readSecretFromStream, readSecretInteractive } from "../../lib/index.ts";
import { log, style } from "../../lib/terminal/index.ts";
import { formatSecretsList } from "./format_list.ts";
import { handleSecretsDelete } from "./handle_delete.ts";
import { handleSecretsSet } from "./handle_set.ts";
import { withSecretsDb } from "./with_secrets_db.ts";

const secretsSet = defineCommand({
  meta: { name: "set", description: "Store an API key (interactive or piped)" },
  args: {
    key: {
      type: "positional",
      description: "Key name (e.g. ANTHROPIC_API_KEY)",
      required: true,
    },
  },
  async run({ args }) {
    await withSecretsDb(async (db) => {
      let raw: string;
      if (!process.stdin.isTTY) {
        raw = await readSecretFromStream(process.stdin);
      } else {
        raw = await readSecretInteractive(`  Value for ${style.bold(args.key)}: `);
      }

      if (!raw) {
        throw new Error(
          "No value provided. Pipe a value or run in a terminal for interactive input.",
        );
      }

      const result = handleSecretsSet(db, args.key, raw);
      if (!result.success) {
        throw new Error(result.error!);
      }
      if (result.warning) log.warn(result.warning);
      if (result.aliased) {
        log.done(`${args.key} ${style.dim("->")} ${result.canonical} stored`);
      } else {
        log.done(`${result.canonical} stored`);
      }
    });
  },
});

const secretsDelete = defineCommand({
  meta: { name: "delete", description: "Remove an API key" },
  args: {
    key: {
      type: "positional",
      description: "Key name",
      required: true,
    },
  },
  async run({ args }) {
    await withSecretsDb((db) => {
      const existed = handleSecretsDelete(db, args.key);
      const canonical = canonicalKeyName(args.key);
      if (existed) {
        log.done(`${canonical} deleted`);
      } else {
        log.info(`${canonical} was not configured`);
      }
    });
  },
});

const secretsList = defineCommand({
  meta: { name: "list", description: "Show all configured keys" },
  async run() {
    await withSecretsDb((db) => {
      for (const line of formatSecretsList(db)) {
        console.log(line);
      }
    });
  },
});

export default defineCommand({
  meta: { name: "secrets", description: "Manage API keys and tokens" },
  subCommands: { set: secretsSet, delete: secretsDelete, list: secretsList },
});
