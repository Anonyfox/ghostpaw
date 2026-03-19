import { Chat } from "chatoyant";
import { defineCommand } from "citty";
import { closeSession, createSession, executeTurn } from "../../core/chat/api/write/index.ts";
import { resolveSoul } from "../../core/souls/api/read/index.ts";
import { resolveModel } from "../../harness/model.ts";
import { buildNamePrompt, NAME_SYSTEM_PROMPT } from "../../harness/oneshots/generate_soul_text.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: {
    name: "generate-name",
    description: "Generate a name suggestion for a soul via LLM",
  },
  args: {
    name: {
      type: "positional",
      description: "Soul ID or name",
      required: true,
    },
  },
  async run({ args }) {
    const soulArg = (args._ ?? []).join(" ") || (args.name as string);
    if (!soulArg?.trim()) {
      console.error(style.boldRed("error".padStart(10)), " Soul ID or name is required.");
      process.exitCode = 1;
      return;
    }

    await withRunDb(async (db) => {
      const soul = resolveSoul(db, soulArg);
      if (!soul) {
        console.error(style.boldRed("error".padStart(10)), ` Soul "${soulArg}" not found.`);
        process.exitCode = 1;
        return;
      }

      const prompt = buildNamePrompt(soul.name, soul.description, soul.essence);
      const model = resolveModel(db);
      const systemSession = createSession(db, `system:soul-name:${soul.id}:${Date.now()}`, {
        purpose: "system",
      });
      const sessionId = systemSession.id as number;

      try {
        const result = await executeTurn(
          {
            sessionId,
            content: prompt,
            systemPrompt: NAME_SYSTEM_PROMPT,
            model,
            maxIterations: 1,
            maxTokens: 30,
          },
          { db, tools: [], createChat: (m: string) => new Chat({ model: m }) },
        );

        const raw = result.content.trim().replace(/^["']|["']$/g, "");
        if (raw && !raw.startsWith("Error:")) {
          process.stdout.write(`${raw}\n`);
          process.stderr.write(`${style.dim(`Cost: $${result.cost.estimatedUsd.toFixed(4)}`)}\n`);
        } else {
          console.error(style.boldRed("error".padStart(10)), " Failed to generate suggestion.");
          process.exitCode = 1;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(style.boldRed("error".padStart(10)), ` ${msg}`);
        process.exitCode = 1;
      } finally {
        closeSession(db, sessionId);
      }
    });
  },
});
