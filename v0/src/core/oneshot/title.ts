import { Chat, Message } from "chatoyant";
import { chatConfigForModel } from "../../lib/detect_provider.ts";
import { getMessages } from "../chat/messages.ts";
import { createSession, getSession, renameSession } from "../chat/session.ts";
import type { OneshotRegistry, OneshotRunOpts } from "./types.ts";

const NAME = "generate-title";

const SYSTEM_PROMPT =
  "You generate concise chat titles. Output ONLY the title, nothing else. Max 6 words.";

function buildPrompt(userContent: string): string {
  const truncated = userContent.length > 200 ? userContent.slice(0, 200) : userContent;
  return `Generate a title for a chat that starts with: ${truncated}`;
}

function shouldFire(opts: OneshotRunOpts): boolean {
  const session = getSession(opts.db, opts.sessionId);
  if (!session || session.title !== null) return false;
  const messages = getMessages(opts.db, opts.sessionId);
  return messages.length === 1;
}

async function execute(opts: OneshotRunOpts): Promise<void> {
  const child = createSession(opts.db, opts.model, SYSTEM_PROMPT, {
    purpose: "system",
    title: NAME,
    parentSessionId: opts.sessionId,
    triggeredByMessageId: opts.triggerMessageId,
  });

  const chat = new Chat(chatConfigForModel(opts.model));
  chat.system(SYSTEM_PROMPT);
  chat.addMessage(new Message("user", buildPrompt(opts.userContent)));

  const raw = await chat.generate({ maxIterations: 1 });
  const title = (raw ?? "").trim().replace(/^["']|["']$/g, "");

  if (title) {
    renameSession(opts.db, opts.sessionId, title);
  }

  renameSession(opts.db, child.id, `${NAME}:${opts.sessionId}`);
}

export function registerTitleOneshot(registry: OneshotRegistry): void {
  registry.register({ name: NAME, shouldFire, execute });
}
