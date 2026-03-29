import type { OneshotDefinition, OneshotRegistry } from "./types.ts";

export function createOneshotRegistry(): OneshotRegistry {
  const definitions = new Map<string, OneshotDefinition>();

  return {
    register(definition: OneshotDefinition): void {
      definitions.set(definition.name, definition);
    },
    get(name: string): OneshotDefinition | undefined {
      return definitions.get(name);
    },
    list(): OneshotDefinition[] {
      return [...definitions.values()];
    },
    names(): string[] {
      return [...definitions.keys()];
    },
  };
}
