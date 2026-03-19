import { strictEqual } from "node:assert";
import { describe, it } from "node:test";

import { statusCronFromOutput } from "./service_status.ts";

describe("statusCronFromOutput", () => {
  it("detects installed when crontab contains workspace path", () => {
    const output = `# some comment\n@reboot cd "/home/user/ghostpaw" && node ghostpaw.mjs >> stderr.log 2>&1\n`;
    const result = statusCronFromOutput("/home/user/ghostpaw", output);
    strictEqual(result.installed, true);
    strictEqual(result.initSystem, "cron");
  });

  it("reports not installed when crontab is empty", () => {
    const result = statusCronFromOutput("/home/user/ghostpaw", "");
    strictEqual(result.installed, false);
    strictEqual(result.initSystem, "cron");
  });

  it("reports not installed when crontab has no matching workspace", () => {
    const output = `@reboot cd "/other/project" && node other.mjs\n`;
    const result = statusCronFromOutput("/home/user/ghostpaw", output);
    strictEqual(result.installed, false);
  });

  it("reports not running (cron cannot detect runtime state)", () => {
    const output = `@reboot cd "/app" && node ghostpaw.mjs\n`;
    const result = statusCronFromOutput("/app", output);
    strictEqual(result.running, false);
  });
});
