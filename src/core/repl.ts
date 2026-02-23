import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { banner, blank, log, style } from "../lib/terminal.js";

declare const __VERSION__: string;
let VERSION: string;
try {
  VERSION = __VERSION__;
} catch {
  VERSION = "dev";
}

export async function startRepl(workspace: string): Promise<void> {
  const { createDatabase } = await import("./database.js");
  const { createSecretStore } = await import("./secrets.js");
  const { createAgent } = await import("../index.js");

  workspace = resolve(workspace);
  const db = await createDatabase(resolve(workspace, "ghostpaw.db"));
  const secrets = createSecretStore(db);
  const { createSessionStore } = await import("./session.js");

  secrets.loadIntoEnv();
  secrets.syncProviderKeys();

  const sessions = createSessionStore(db);
  const unabsorbed = sessions.countUnabsorbed();
  db.close();

  const agent = await createAgent({ workspace });

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  blank();
  banner("ghostpaw", VERSION);
  const trainHint = unabsorbed > 0
    ? `/train level up ${style.dim(`(${unabsorbed} session${unabsorbed === 1 ? "" : "s"} ready)`)}`
    : "/train level up";
  console.log(style.dim(`  ${trainHint}  /clear reset  /exit quit`));
  blank();

  const prompt = style.bold("> ");
  const responsePrefix = style.dim("ghostpaw ");

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
      if (trimmed === "/clear") {
        log.info("session cleared (not yet implemented)");
        continue;
      }
      if (trimmed === "/train") {
        try {
          const { train } = await import("./reflect.js");
          rl.close();
          await train(workspace, { stream: true });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          log.error(msg);
        }
        return;
      }

      try {
        process.stdout.write(responsePrefix);
        for await (const chunk of agent.stream(trimmed)) {
          process.stdout.write(chunk);
        }
        process.stdout.write("\n\n");
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
  }
}
