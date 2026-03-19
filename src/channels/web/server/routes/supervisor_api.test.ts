import { strictEqual } from "node:assert";
import { describe, it } from "node:test";

describe("supervisor API cooldown logic", () => {
  it("cooldown prevents rapid restarts", () => {
    let lastRestart = 0;
    const COOLDOWN_MS = 30_000;

    function tryRestart(now: number): boolean {
      if (lastRestart > 0 && now - lastRestart < COOLDOWN_MS) return false;
      lastRestart = now;
      return true;
    }

    strictEqual(tryRestart(1000), true);
    strictEqual(tryRestart(2000), false);
    strictEqual(tryRestart(32000), true);
  });
});
