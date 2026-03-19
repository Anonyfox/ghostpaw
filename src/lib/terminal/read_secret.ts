/**
 * Read a line from stdin with masked echo (shows * for each character).
 * Handles backspace, Enter, and Ctrl+C. Requires a TTY.
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

    const onData = (key: string) => {
      if (key === "\u0003") {
        cleanup();
        process.stdout.write("\n");
        reject(new Error("Cancelled"));
        return;
      }

      if (key === "\r" || key === "\n") {
        cleanup();
        process.stdout.write("\n");
        resolve(input);
        return;
      }

      if (key === "\u007F" || key === "\b") {
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write("\b \b");
        }
        return;
      }

      if (key.charCodeAt(0) < 32) return;

      input += key;
      process.stdout.write("*");
    };

    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
    };

    process.stdin.on("data", onData);
  });
}
