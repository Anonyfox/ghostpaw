import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { senseState } from "./sense_state.ts";
import type { PreviousReading } from "./sense_types.ts";

const { values, positionals } = parseArgs({
  options: {
    text: { type: "string" },
    previous: { type: "string" },
  },
  allowPositionals: true,
  strict: false,
});

let text = values.text as string | undefined;

if (!text && positionals.length > 0) {
  text = readFileSync(positionals[0], "utf-8");
}

if (!text) {
  process.stderr.write("Usage: npx tsx src/lib/sense/cli.ts --text '...' [--previous '{...}']\n");
  process.stderr.write("   or: npx tsx src/lib/sense/cli.ts path/to/file.md\n");
  process.exit(1);
}

let previous: PreviousReading | undefined;
if (values.previous) {
  try {
    const parsed = JSON.parse(values.previous as string);
    if (parsed.metrics && typeof parsed.metrics === "object") {
      previous = { metrics: parsed.metrics, textInfo: parsed.textInfo };
    }
  } catch {
    process.stderr.write("Warning: could not parse --previous JSON, ignoring.\n");
  }
}

const result = await senseState(text, previous);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
