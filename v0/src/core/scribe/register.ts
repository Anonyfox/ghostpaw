import type { DatabaseHandle } from "../../lib/database_handle.ts";
import type { SubsystemRegistry } from "../interceptor/registry.ts";
import { runCodexSubagent } from "./subagent.ts";

export function registerScribeSubsystem(
  registry: SubsystemRegistry,
  soulsDb: DatabaseHandle,
  scribeId: number,
): void {
  registry.register({
    name: "scribe",
    defaultLookback: 3,
    defaultTimeoutMs: 60000,
    run: (opts) => runCodexSubagent(opts, soulsDb, scribeId),
  });
}
