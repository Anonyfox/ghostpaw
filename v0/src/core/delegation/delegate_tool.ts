import { read, type SoulsDb } from "@ghostpaw/souls";
import { createTool, Schema, type Tool } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { createTools } from "../tools/index.ts";
import { executeDelegation } from "./handler.ts";

function buildDescription(soulsDb: DatabaseHandle, internalSoulIds: Set<number>): string {
  const souls = read
    .listSouls(soulsDb as unknown as SoulsDb)
    .filter((s) => !internalSoulIds.has(s.id));

  if (souls.length === 0) {
    return [
      "Delegate a task to a specialist soul. No specialists currently available.",
      "Use ask_mentor to create one.",
    ].join("\n");
  }

  const roster = souls.map((s) => `  id=${s.id} "${s.name}" — ${s.description}`).join("\n");

  return [
    "DELEGATE a task to a specialist soul by numeric ID.",
    "The specialist runs autonomously with its own evolved identity and tools.",
    "Returns the specialist's complete response.",
    "",
    "ALWAYS use this when a specialist's domain matches the task.",
    "You are a coordinator — route domain work to the right specialist",
    "instead of doing it yourself.",
    "",
    "DO NOT use for: general conversation, questions with no specialist match.",
    "",
    `Available specialists:\n${roster}`,
  ].join("\n");
}

class DelegateParams extends Schema {
  soul_id = Schema.Integer({
    description:
      "Numeric ID of the specialist soul to delegate to. See available specialists above.",
  });
  task = Schema.String({
    description: "The task description for the specialist. Be specific about what you need done.",
  });
}

export interface CreateDelegateToolOptions {
  db: DatabaseHandle;
  soulsDb: DatabaseHandle;
  workspace: string;
  model: string;
  internalSoulIds: Set<number>;
  timeoutMs: number;
}

export function createDelegateTool(opts: CreateDelegateToolOptions): Tool {
  const { db, soulsDb, workspace, model, internalSoulIds, timeoutMs } = opts;
  const description = buildDescription(soulsDb, internalSoulIds);

  return createTool({
    name: "delegate",
    description,
    timeout: timeoutMs,
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new DelegateParams() as any,
    execute: async ({ args }) => {
      const { soul_id, task } = args as { soul_id: number; task: string };

      if (internalSoulIds.has(soul_id)) {
        return {
          error: `Soul ${soul_id} is an internal soul and cannot be delegated to via this tool.`,
          hint: "Use ask_mentor for soul management tasks.",
        };
      }

      const soul = read.getSoul(soulsDb as unknown as SoulsDb, soul_id);
      if (!soul) {
        return {
          error: `No soul found with id ${soul_id}.`,
          hint: "Check the available specialists listed in this tool's description.",
        };
      }
      if (soul.isDormant) {
        return {
          error: `Soul "${soul.name}" (id=${soul_id}) is retired and cannot accept tasks.`,
          hint: "Use ask_mentor to awaken it or choose a different specialist.",
        };
      }

      const tools = createTools(workspace);
      const result = await executeDelegation({ db, soulsDb, soulId: soul_id, task, tools, model });

      if (!result.succeeded) {
        return {
          ok: false,
          sessionId: result.sessionId,
          soulId: result.soulId,
          error: result.content,
        };
      }

      return {
        ok: true,
        sessionId: result.sessionId,
        soulId: result.soulId,
        response: result.content,
      };
    },
  });
}
