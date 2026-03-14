import { strictEqual } from "node:assert";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const legacyHowlNamespace = path.resolve(here, "../../../howl");

describe("chat howl ownership", () => {
  it("does not keep legacy howl source files", () => {
    if (!existsSync(legacyHowlNamespace)) {
      strictEqual(true, true);
      return;
    }

    const remainingFiles = readdirSync(legacyHowlNamespace).filter((entry) =>
      entry.endsWith(".ts"),
    );
    strictEqual(remainingFiles.length, 0);
  });
});
