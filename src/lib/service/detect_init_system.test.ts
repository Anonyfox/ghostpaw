import { ok } from "node:assert";
import { describe, it } from "node:test";
import { detectInitSystem } from "./detect_init_system.ts";

describe("detectInitSystem", () => {
  it("returns a valid init system string", () => {
    const result = detectInitSystem();
    ok(["systemd", "launchd", "cron"].includes(result));
  });

  it("returns launchd on macOS", () => {
    if (process.platform !== "darwin") return;
    ok(detectInitSystem() === "launchd");
  });
});
