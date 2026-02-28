import { readFileSync } from "node:fs";
import { Chat } from "chatoyant";
import { defineCommand } from "citty";
import { formatTokens, label, style } from "../../lib/terminal/index.ts";
import { handleRun } from "./handle_run.ts";
import { handleRunStream } from "./handle_run_stream.ts";
import { resolvePrompt } from "./resolve_prompt.ts";
import { withRunDb } from "./with_run_db.ts";

function readStdin(): string | null {
  try {
    return readFileSync(0, "utf-8");
  } catch {
    return null;
  }
}

function isProviderKeyError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("api key") ||
    msg.includes("apikey") ||
    msg.includes("authentication") ||
    msg.includes("unauthorized") ||
    err.constructor.name === "ProviderError"
  );
}

export default defineCommand({
  meta: { name: "run", description: "Send a one-off prompt to the LLM" },
  args: {
    prompt: {
      type: "positional",
      description: "The prompt to send (or pipe via stdin)",
      required: false,
    },
    model: {
      type: "string",
      alias: "m",
      description: "Model override (default: from config)",
      required: false,
    },
    system: {
      type: "string",
      alias: "s",
      description: "Custom system prompt",
      required: false,
    },
    "no-stream": {
      type: "boolean",
      description: "Disable streaming (wait for full response)",
      default: false,
    },
  },
  async run({ args }) {
    const stdinContent = process.stdin.isTTY ? null : readStdin();
    const prompt = resolvePrompt(args.prompt as string | undefined, args._ ?? [], stdinContent);

    const modelOverride = args.model as string | undefined;
    const systemPrompt = args.system as string | undefined;
    const shouldStream = !args["no-stream"] && process.stdout.isTTY === true;
    const createChat = (model: string) => new Chat({ model });

    try {
      await withRunDb(async (db) => {
        if (shouldStream) {
          const gen = handleRunStream(db, {
            prompt,
            model: modelOverride,
            systemPrompt,
            createChat,
          });

          let hasOutput = false;
          for (;;) {
            const next = await gen.next();
            if (next.done) {
              if (next.value.content.startsWith("Error: ")) {
                if (hasOutput) process.stdout.write("\n");
                writeError(next.value.content.slice(7));
                process.exitCode = 1;
              } else {
                process.stdout.write("\n\n");
                label("", formatTokens(next.value.totalTokens), style.dim);
              }
              break;
            }
            process.stdout.write(next.value);
            hasOutput = true;
          }
        } else {
          const result = await handleRun(db, {
            prompt,
            model: modelOverride,
            systemPrompt,
            createChat,
          });

          if (result.content.startsWith("Error: ")) {
            writeError(result.content.slice(7));
            process.exitCode = 1;
            return;
          }

          process.stdout.write(result.content);
          if (process.stdout.isTTY) {
            process.stdout.write("\n\n");
            label("", formatTokens(result.totalTokens), style.dim);
          } else {
            process.stdout.write("\n");
          }
        }
      });
    } catch (err) {
      if (isProviderKeyError(err)) {
        const msg = err instanceof Error ? err.message : String(err);
        writeError(msg);
        process.stderr.write(
          `${style.dim("hint".padStart(10))}  Run ${style.cyan("ghostpaw secrets set <PROVIDER>_API_KEY")} to configure.\n`,
        );
        process.exitCode = 1;
        return;
      }
      throw err;
    }
  },
});

function writeError(msg: string): void {
  process.stderr.write(`${style.boldRed("error".padStart(10))}  ${msg}\n`);
}
