import type { Readable } from "node:stream";

export async function readSecretInteractive(
  prompt: string,
  opts?: { input?: Readable; output?: NodeJS.WritableStream },
): Promise<string> {
  const input = opts?.input ?? process.stdin;
  const output = opts?.output ?? process.stdout;
  output.write(prompt);

  const { Writable } = await import("node:stream");
  const muted = new Writable({
    write(_chunk, _enc, cb) {
      cb();
    },
  });

  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({
    input,
    output: muted,
    terminal: Boolean((input as { isTTY?: boolean }).isTTY),
  });

  try {
    const val = await rl.question("");
    output.write("\n");
    return val.trim();
  } finally {
    rl.close();
  }
}
