import type { DatabaseHandle } from "../../lib/database_handle.ts";
import type { SubsystemRegistry } from "../interceptor/registry.ts";
import { runAffinitySubagent } from "./subagent.ts";

export function registerInnkeeperSubsystem(
  registry: SubsystemRegistry,
  soulsDb: DatabaseHandle,
  innkeeperId: number,
): void {
  registry.register({
    name: "innkeeper",
    defaultLookback: 3,
    defaultTimeoutMs: 60000,
    run: (opts) => runAffinitySubagent(opts, soulsDb, innkeeperId),
  });
}
