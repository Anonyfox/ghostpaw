import type { DatabaseHandle } from "../../lib/index.ts";
import type { ChatFactory } from "./chat_instance.ts";
import { closeSession } from "./close_session.ts";
import { createSession } from "./create_session.ts";
import { executeTurn } from "./execute_turn.ts";
import { getSession } from "./get_session.ts";
import { renameSession } from "./rename_session.ts";

const TITLE_SYSTEM_PROMPT =
  "You generate concise chat titles. Output ONLY the title, nothing else. Max 6 words.";

function buildTitlePrompt(firstUserMessage: string): string {
  const truncated =
    firstUserMessage.length > 200 ? firstUserMessage.slice(0, 200) : firstUserMessage;
  return `Generate a title for a chat that starts with: ${truncated}`;
}

export async function generateSessionTitle(
  db: DatabaseHandle,
  parentSessionId: number,
  firstUserMessage: string,
  model: string,
  createChat: ChatFactory,
): Promise<string | null> {
  const parent = getSession(db, parentSessionId);
  if (!parent) return null;
  if (parent.displayName) return parent.displayName;

  const systemSession = createSession(db, `system:title:${parentSessionId}`, {
    purpose: "system",
  });
  const systemSessionId = systemSession.id as number;

  try {
    const result = await executeTurn(
      {
        sessionId: systemSessionId,
        content: buildTitlePrompt(firstUserMessage),
        systemPrompt: TITLE_SYSTEM_PROMPT,
        model,
        maxIterations: 1,
        maxTokens: 30,
      },
      { db, tools: [], createChat },
    );

    const title = result.content.trim().replace(/^["']|["']$/g, "");
    if (title && !title.startsWith("Error:")) {
      renameSession(db, parentSessionId, title);
      return title;
    }
    return null;
  } finally {
    closeSession(db, systemSessionId);
  }
}
