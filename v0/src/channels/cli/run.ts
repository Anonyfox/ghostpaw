import { createSession, getSession } from "../../core/chat/session.ts";
import type { Agent } from "../../core/chat/types.ts";
import { renderSoul } from "../../core/souls/render.ts";
import type { RuntimeContext } from "../../runtime.ts";

export async function executeRun(
  ctx: RuntimeContext,
  agent: Agent,
  opts: {
    prompt?: string;
    session?: string;
    model?: string;
    noStream?: boolean;
    ghost?: boolean;
  },
): Promise<void> {
  let prompt = opts.prompt;

  if (!prompt && !process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    prompt = Buffer.concat(chunks).toString("utf-8").trim();
  }

  if (!prompt) {
    process.stderr.write("error: no prompt provided\n");
    process.exitCode = 1;
    return;
  }

  let sessionId: number;

  if (opts.session) {
    sessionId = Number.parseInt(opts.session, 10);
    const session = getSession(ctx.db, sessionId);
    if (!session) {
      process.stderr.write(`error: session ${sessionId} not found\n`);
      process.exitCode = 1;
      return;
    }
  } else {
    const systemPrompt = renderSoul(ctx.soulsDb, ctx.soulIds.ghostpaw);
    const session = createSession(ctx.db, ctx.config.model, systemPrompt, {
      soulId: ctx.soulIds.ghostpaw,
    });
    sessionId = session.id;
  }

  const model = opts.model;
  const noStream = opts.noStream ?? false;
  const ghost = opts.ghost ?? false;

  try {
    if (noStream) {
      const result = await agent.executeTurn(sessionId, prompt, { model, ghost });
      process.stderr.write(`session:${result.sessionId}\n`);
      if (!result.succeeded) {
        process.stderr.write(`${result.content}\n`);
        process.exitCode = 1;
        return;
      }
      process.stdout.write(result.content);
      process.stdout.write("\n");
    } else {
      const stream = agent.streamTurn(sessionId, prompt, { model, ghost });
      let result = await stream.next();
      while (!result.done) {
        process.stdout.write(result.value);
        result = await stream.next();
      }
      process.stdout.write("\n");
      const turnResult = result.value;
      process.stderr.write(`session:${turnResult.sessionId}\n`);
      if (!turnResult.succeeded) {
        process.stderr.write(`${turnResult.content}\n`);
        process.exitCode = 1;
        return;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`error: ${msg}\n`);
    process.stderr.write(`session:${sessionId}\n`);
    process.exitCode = 1;
  }
}
