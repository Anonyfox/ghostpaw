import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function isEntrypoint(selfUrl: string): boolean {
  try {
    const self = realpathSync(fileURLToPath(selfUrl));
    const invoked = realpathSync(process.argv[1]);
    return self === invoked;
  } catch {
    return false;
  }
}
