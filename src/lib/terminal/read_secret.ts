const BRACKET_PASTE_START = "\x1b[200~";
const BRACKET_PASTE_END = "\x1b[201~";

/**
 * Read a line from stdin with masked echo (shows * for each character).
 * Handles backspace, Enter, Ctrl+C, and bracketed paste. Requires a TTY.
 */
export function readSecret(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error("readSecret requires a TTY"));
      return;
    }

    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf-8");

    let input = "";

    const processChar = (ch: string) => {
      if (ch === "\u0003") {
        cleanup();
        process.stdout.write("\n");
        reject(new Error("Cancelled"));
        return true;
      }

      if (ch === "\r" || ch === "\n") {
        cleanup();
        process.stdout.write("\n");
        resolve(input);
        return true;
      }

      if (ch === "\u007F" || ch === "\b") {
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write("\b \b");
        }
        return false;
      }

      if (ch.charCodeAt(0) < 32) return false;

      input += ch;
      process.stdout.write("*");
      return false;
    };

    const onData = (chunk: string) => {
      let text = chunk;
      if (text.startsWith(BRACKET_PASTE_START)) {
        text = text.slice(BRACKET_PASTE_START.length);
      }
      if (text.endsWith(BRACKET_PASTE_END)) {
        text = text.slice(0, -BRACKET_PASTE_END.length);
      }

      for (const ch of text) {
        if (processChar(ch)) return;
      }
    };

    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
    };

    process.stdin.on("data", onData);
  });
}
