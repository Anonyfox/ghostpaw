import type { DatabaseHandle } from "../../lib/database_handle.ts";

export interface OneshotRunOpts {
  db: DatabaseHandle;
  sessionId: number;
  triggerMessageId: number;
  userContent: string;
  model: string;
  timeoutMs: number;
}

export interface OneshotDefinition {
  name: string;
  shouldFire(opts: OneshotRunOpts): boolean;
  execute(opts: OneshotRunOpts): Promise<void>;
}

export interface OneshotRegistry {
  register(definition: OneshotDefinition): void;
  get(name: string): OneshotDefinition | undefined;
  list(): OneshotDefinition[];
  names(): string[];
}
