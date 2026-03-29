import type { SubsystemRegistry } from "../interceptor/registry.ts";
import { runAffinitySubagent } from "./subagent.ts";

export function registerInnkeeperSubsystem(registry: SubsystemRegistry): void {
  registry.register({
    name: "innkeeper",
    defaultLookback: 3,
    defaultTimeoutMs: 60000,
    run: runAffinitySubagent,
  });
}
