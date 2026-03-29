/**
 * Read a secret value from the user. Supports three modes:
 * 1. Piped stdin (not a TTY) — reads first line from the pipe
 * 2. Interactive TTY — prompts with masked input (characters echo as *)
 * 3. Copy-paste works naturally in both modes
 */
export async function readSecret(prompt = "Value: "): Promise<string> {
  if (!process.stdin.isTTY) {
    return readFromPipe();
  }
  return readMasked(prompt);
}

function readFromPipe(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      resolve(data.trim());
    });
    process.stdin.on("error", reject);
  });
}

function readMasked(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stderr.write(prompt);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";

    const onData = (ch: string) => {
      const code = ch.charCodeAt(0);

      if (ch === "\r" || ch === "\n") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stderr.write("\n");
        resolve(value.trim());
        return;
      }

      if (code === 3) {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stderr.write("\n");
        resolve("");
        return;
      }

      if (code === 127 || code === 8) {
        if (value.length > 0) {
          value = value.slice(0, -1);
          process.stderr.write("\b \b");
        }
        return;
      }

      if (code < 32 && code !== 22) return;

      // Ctrl+V pastes may arrive as a multi-char chunk — handle gracefully
      if (ch.length > 1) {
        value += ch;
        process.stderr.write("*".repeat(ch.length));
        return;
      }

      value += ch;
      process.stderr.write("*");
    };

    stdin.on("data", onData);
  });
}
