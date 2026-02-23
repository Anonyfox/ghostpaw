import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";

export async function startRepl(workspace: string): Promise<void> {
  const { createDatabase } = await import("./database.js");
  const { createSecretStore } = await import("./secrets.js");
  const { createAgent } = await import("../index.js");

  workspace = resolve(workspace);
  const db = await createDatabase(resolve(workspace, "ghostpaw.db"));
  const secrets = createSecretStore(db);

  secrets.loadIntoEnv();
  secrets.syncProviderKeys();
  db.close();

  const agent = await createAgent({ workspace });

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log("ghostpaw — type a message, /clear to reset, /exit to quit\n");

  try {
    for (;;) {
      let line: string;
      try {
        line = await rl.question("you> ");
      } catch {
        break; // Ctrl+D or closed stdin
      }

      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed === "/exit" || trimmed === "/quit") break;
      if (trimmed === "/clear") {
        console.log("(session cleared — not yet implemented)");
        continue;
      }

      try {
        process.stdout.write("ghostpaw> ");
        for await (const chunk of agent.stream(trimmed)) {
          process.stdout.write(chunk);
        }
        process.stdout.write("\n\n");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stdout.write("\n");
        console.error(`error: ${msg}`);
        console.error("(type another message to retry, or /exit to quit)\n");
      }
    }
  } finally {
    rl.close();
  }
}
