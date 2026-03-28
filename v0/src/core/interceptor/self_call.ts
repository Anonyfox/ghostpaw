import type { Tool } from "chatoyant";
import type { SubsystemRegistry } from "./registry.ts";

/**
 * Creates deflection tools for each registered subsystem. When the main LLM
 * sees subsystem_* tool calls in its history and tries to call them directly,
 * these handlers return an instant message explaining the subsystem runs
 * automatically.
 */
export function createDeflectionTools(registry: SubsystemRegistry): Tool[] {
  return registry.list().map((def) => {
    const toolName = `subsystem_${def.name}`;
    return {
      name: toolName,
      description: `Automatic ${def.name} subsystem — runs transparently every turn. Do not call directly.`,
      getParametersSchema() {
        return {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "object",
          properties: {},
        };
      },
      async executeCall(call: { id: string; name: string; args: unknown }) {
        return {
          id: call.id,
          result: `This subsystem runs automatically every turn. Its latest results are already in your context above. You do not need to call it.`,
          success: true,
        };
      },
      // biome-ignore lint/suspicious/noExplicitAny: duck-typed tool shim
    } as any as Tool;
  });
}
