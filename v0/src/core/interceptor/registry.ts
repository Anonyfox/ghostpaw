import type { Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";

export interface SubsystemRunOpts {
  db: DatabaseHandle;
  chatDb: DatabaseHandle;
  parentSessionId: number;
  triggerMessageId: number;
  context: Message[];
  model: string;
  maxIterations: number;
  timeoutMs: number;
}

export interface SubsystemResult {
  sessionId: number;
  summary: string;
  succeeded: boolean;
}

export interface SubsystemDefinition {
  name: string;
  defaultLookback: number;
  defaultTimeoutMs: number;
  run(opts: SubsystemRunOpts): Promise<SubsystemResult>;
}

export interface SubsystemRegistry {
  register(definition: SubsystemDefinition): void;
  get(name: string): SubsystemDefinition | undefined;
  list(): SubsystemDefinition[];
  names(): string[];
}

export function createSubsystemRegistry(): SubsystemRegistry {
  const definitions = new Map<string, SubsystemDefinition>();

  return {
    register(definition: SubsystemDefinition): void {
      definitions.set(definition.name, definition);
    },
    get(name: string): SubsystemDefinition | undefined {
      return definitions.get(name);
    },
    list(): SubsystemDefinition[] {
      return [...definitions.values()];
    },
    names(): string[] {
      return [...definitions.keys()];
    },
  };
}
