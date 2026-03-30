import { createTool, Schema, type Tool } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { createMentorTools } from "../souls/mentor_tools.ts";
import { executeDelegation } from "./handler.ts";

const DESCRIPTION = [
  "Delegate a soul management task to the Mentor — the identity specialist",
  "who creates, inspects, refines, and evolves souls.",
  "Returns the Mentor's analysis or confirmation.",
  "",
  "Use this for creating new specialist souls, reviewing soul health,",
  "proposing trait changes, and guiding level-ups.",
  "Do NOT use for general coding, web, or filesystem tasks — use delegate or your own tools.",
].join("\n");

class AskMentorParams extends Schema {
  task = Schema.String({
    description:
      "The soul management task for the Mentor. Be specific: which soul, what operation, why.",
  });
}

export interface CreateAskMentorToolOptions {
  db: DatabaseHandle;
  soulsDb: DatabaseHandle;
  mentorSoulId: number;
  modelSmall: string;
  timeoutMs: number;
}

export function createAskMentorTool(opts: CreateAskMentorToolOptions): Tool {
  const { db, soulsDb, mentorSoulId, modelSmall, timeoutMs } = opts;

  return createTool({
    name: "ask_mentor",
    description: DESCRIPTION,
    timeout: timeoutMs,
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new AskMentorParams() as any,
    execute: async ({ args }) => {
      const { task } = args as { task: string };

      const tools = createMentorTools(soulsDb);
      const result = await executeDelegation({
        db,
        soulsDb,
        soulId: mentorSoulId,
        task,
        tools,
        model: modelSmall,
      });

      if (!result.succeeded) {
        return {
          ok: false,
          sessionId: result.sessionId,
          error: result.content,
        };
      }

      return {
        ok: true,
        sessionId: result.sessionId,
        response: result.content,
      };
    },
  });
}
