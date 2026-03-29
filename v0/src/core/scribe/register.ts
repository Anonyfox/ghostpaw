import type { SubsystemRegistry } from "../interceptor/registry.ts";
import { runCodexSubagent } from "./subagent.ts";

export function registerScribeSubsystem(registry: SubsystemRegistry): void {
  registry.register({
    name: "scribe",
    defaultLookback: 3,
    defaultTimeoutMs: 60000,
    run: runCodexSubagent,
  });
}
