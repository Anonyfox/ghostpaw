import type { ChatFactory } from "../../core/chat/chat_instance.ts";
import { closeSession, createSession, executeTurn, getHistory } from "../../core/chat/index.ts";
import { getMemory } from "../../core/memory/api/read/index.ts";
import { MANDATORY_SOUL_IDS } from "../../core/souls/api/read/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { assembleContext } from "../context.ts";
import { renderPackBond } from "../internal/render_pack_bond.ts";
import { createWardenTools } from "../tools.ts";

const COMMAND_PREFIX = `You are handling a direct command. Execute it using your tools.
- If successful, confirm briefly what changed.
- If the instruction is ambiguous or you need clarification, explain what's unclear. Do NOT guess.
- Do NOT make small talk. One task, one response.`;

const MAX_COMMAND_ITERATIONS = 5;

export interface CommandInput {
  text: string;
  channel: "web" | "cli";
  memberId?: number;
  memoryId?: number;
}

export interface CommandResult {
  response: string;
  cost: number;
  sessionId: number;
  acted: boolean;
}

export async function executeCommand(
  db: DatabaseHandle,
  model: string,
  createChat: ChatFactory,
  input: CommandInput,
): Promise<CommandResult> {
  const session = createSession(db, `${input.channel}:command:${Date.now()}`, {
    purpose: "command",
    soulId: MANDATORY_SOUL_IDS.warden,
  });
  const sessionId = session.id as number;

  try {
    const tools = createWardenTools(db);
    const systemPrompt = assembleContext(db, "", {
      soulId: MANDATORY_SOUL_IDS.warden,
    });

    const parts: string[] = [COMMAND_PREFIX];

    if (input.memberId) {
      const rendered = renderPackBond(db, input.memberId);
      if (rendered) {
        parts.push("", "## Target Member", "", rendered);
      }
    }

    if (input.memoryId) {
      const mem = getMemory(db, input.memoryId);
      if (mem) {
        parts.push(
          "",
          "## Target Memory",
          "",
          `Memory #${mem.id}: "${mem.claim}"`,
          `Confidence: ${mem.confidence}, source: ${mem.source}, ` +
            `category: ${mem.category}, evidence: ${mem.evidenceCount}`,
        );
      }
    }

    parts.push("", input.text);
    const content = parts.join("\n");

    const result = await executeTurn(
      {
        sessionId,
        content,
        systemPrompt,
        model,
        maxIterations: MAX_COMMAND_ITERATIONS,
      },
      { db, tools, createChat },
    );

    const history = getHistory(db, sessionId);
    const acted = history.some((m) => m.role === "tool_call");

    return {
      response: result.content,
      cost: result.cost.estimatedUsd,
      sessionId,
      acted,
    };
  } finally {
    closeSession(db, sessionId);
  }
}
