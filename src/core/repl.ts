import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import type { ChannelAdapter } from "../channels/runtime.js";
import type { TelegramStartResult } from "../channels/telegram.js";
import { banner, blank, formatTokens, label, log, style } from "../lib/terminal.js";

declare const __VERSION__: string;
let VERSION: string;
try {
  VERSION = __VERSION__;
} catch {
  VERSION = "dev";
}

export async function startRepl(workspace: string): Promise<void> {
  const { createDatabase } = await import("./database.js");
  const { createAgent } = await import("../index.js");
  const { createSessionStore } = await import("./session.js");
  const { createMemoryStore } = await import("./memory.js");

  workspace = resolve(workspace);
  const db = await createDatabase(resolve(workspace, "ghostpaw.db"));
  const sessions = createSessionStore(db);
  const memory = createMemoryStore(db);
  const unabsorbed = sessions.countUnabsorbed();
  const memCount = memory.count();
  db.close();

  const agent = await createAgent({ workspace });

  // ── Start channels — await connection before showing banner ──────────
  const channels: ChannelAdapter[] = [];
  const channelStatus: string[] = [];

  // Shared channel runtime — created once, used by all channels
  let sharedRuntime: Awaited<
    ReturnType<typeof import("../channels/runtime.js").createChannelRuntime>
  > | null = null;
  async function getRuntime() {
    if (!sharedRuntime) {
      const { createChannelRuntime } = await import("../channels/runtime.js");
      sharedRuntime = await createChannelRuntime({ workspace });
    }
    return sharedRuntime;
  }

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  if (telegramToken) {
    try {
      const runtime = await getRuntime();
      const { createTelegramChannel } = await import("../channels/telegram.js");
      const telegram = createTelegramChannel({ token: telegramToken, runtime });
      const result = (await telegram.start()) as TelegramStartResult;
      channels.push(telegram);
      channelStatus.push(`telegram ${style.dim(`@${result.username}`)}`);
    } catch {
      channelStatus.push(`telegram ${style.dim("failed")}`);
    }
  }

  const webPassword = process.env.WEB_UI_PASSWORD;
  if (webPassword) {
    try {
      const runtime = await getRuntime();
      const { createWebChannel } = await import("../web/index.js");
      const web = createWebChannel(runtime);
      const result = (await web.start()) as { url: string };
      channels.push(web);
      channelStatus.push(`web ${style.dim(result.url)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      channelStatus.push(`web ${style.dim(`failed: ${msg}`)}`);
    }
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  blank();
  banner("ghostpaw", VERSION);
  blank();
  if (channelStatus.length > 0) {
    label("channels", channelStatus.join(", "), style.boldCyan);
  }
  const trainMeta =
    unabsorbed > 0
      ? `level up ${style.dim(`· ${unabsorbed} session${unabsorbed === 1 ? "" : "s"} ready`)}`
      : style.dim("level up");
  const scoutMeta =
    memCount > 0
      ? `explore ${style.dim(`· ${memCount} memor${memCount === 1 ? "y" : "ies"}`)}`
      : style.dim("explore");
  label("/train", trainMeta, style.boldCyan);
  label("/scout", scoutMeta, style.boldCyan);
  label("/exit", style.dim("quit"), style.dim);
  blank();

  const prompt = style.bold("> ");
  const responsePrefix = style.cyan("ghostpaw ");

  try {
    for (;;) {
      let line: string;
      try {
        line = await rl.question(prompt);
      } catch {
        break;
      }

      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed === "/exit" || trimmed === "/quit") break;

      // Direct fast-paths — skip the LLM round-trip for explicit commands
      if (trimmed === "/train") {
        try {
          const { train } = await import("./reflect.js");
          await train(workspace);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          log.error(msg);
        }
        continue;
      }

      if (trimmed === "/scout") {
        try {
          const { scout } = await import("./scout.js");
          await scout(workspace);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          log.error(msg);
        }
        continue;
      }

      // Everything else — including natural train/scout intent — goes to the agent.
      // The agent has train and scout tools and will call them when appropriate.
      try {
        blank();
        process.stdout.write(responsePrefix);
        let chars = 0;
        for await (const chunk of agent.stream(trimmed)) {
          process.stdout.write(chunk);
          chars += chunk.length;
        }
        process.stdout.write("\n");
        label("", formatTokens(Math.ceil(chars / 4)), style.dim);
        blank();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stdout.write("\n");
        log.error(msg);
        console.log(style.dim("  type another message to retry, or /exit to quit"));
        blank();
      }
    }
  } finally {
    rl.close();
    for (const ch of channels) {
      await ch.stop().catch(() => {});
    }
  }
}
