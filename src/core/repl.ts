import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { label, banner, blank, log, style } from "../lib/terminal.js";
import type { ScoutTrail } from "./scout.js";

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
  const { createSessionStore } = await import("./session.js");
  const { createMemoryStore } = await import("./memory.js");

  workspace = resolve(workspace);
  const db = await createDatabase(resolve(workspace, "ghostpaw.db"));
  const secrets = createSecretStore(db);

  secrets.loadIntoEnv();
  secrets.syncProviderKeys();

  const sessions = createSessionStore(db);
  const memory = createMemoryStore(db);
  const unabsorbed = sessions.countUnabsorbed();
  const memCount = memory.count();
  db.close();

  const agent = await createAgent({ workspace });

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  blank();
  banner("ghostpaw", VERSION);
  const scoutHint = memCount > 0
    ? `/scout discover ${style.dim(`(${memCount} memor${memCount === 1 ? "y" : "ies"})`)}`
    : "/scout discover";
  const trainHint = unabsorbed > 0
    ? `/train level up ${style.dim(`(${unabsorbed} session${unabsorbed === 1 ? "" : "s"} ready)`)}`
    : "/train level up";
  console.log(style.dim(`  ${scoutHint}  ${trainHint}  /exit quit`));
  blank();

  const prompt = style.bold("> ");
  const responsePrefix = style.dim("ghostpaw ");

  let lastTrails: ScoutTrail[] | null = null;

  async function runDirectedScout(direction: string): Promise<void> {
    const { buildScoutPrompt } = await import("./scout.js");
    const scoutPrompt = buildScoutPrompt(workspace, direction);
    blank();
    label("scouting", direction, style.boldCyan);
    blank();
    process.stdout.write(responsePrefix);
    for await (const chunk of agent.stream(scoutPrompt)) {
      process.stdout.write(chunk);
    }
    process.stdout.write("\n");
    blank();
    label("scouted", style.bold(direction), style.boldGreen);
    log.info("Say 'craft it' to turn this into a skill, or ask to adjust.");
    blank();
  }

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

      // Trail selection: single digit after scout suggestions
      if (lastTrails && /^[1-9]$/.test(trimmed)) {
        const idx = parseInt(trimmed, 10) - 1;
        if (idx < lastTrails.length) {
          const direction = lastTrails[idx]!.title;
          lastTrails = null;
          try {
            await runDirectedScout(direction);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            log.error(msg);
          }
          continue;
        }
      }
      lastTrails = null;

      if (trimmed === "/train") {
        try {
          const { train } = await import("./reflect.js");
          await train(workspace, { stream: true });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          log.error(msg);
        }
        continue;
      }

      if (trimmed === "/scout" || trimmed.startsWith("/scout ")) {
        const direction = trimmed.slice(6).trim() || undefined;

        if (!direction) {
          try {
            log.info("Scouting — sniffing out new trails...");
            blank();
            const { runScout } = await import("./scout.js");
            const result = await runScout(workspace);
            if (result.trails && result.trails.length > 0) {
              lastTrails = result.trails;
              for (let i = 0; i < result.trails.length; i++) {
                label(`${i + 1}`, style.bold(result.trails[i]!.title), style.boldCyan);
                label("", result.trails[i]!.why, style.dim);
                blank();
              }
              log.info("Type a number to explore, or /scout <your own idea>");
            } else {
              log.info("Not enough experience yet — try /scout <direction> or use me more first.");
            }
            blank();
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            log.error(msg);
          }
          continue;
        }

        try {
          await runDirectedScout(direction);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          log.error(msg);
        }
        continue;
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
