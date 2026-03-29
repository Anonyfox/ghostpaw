import { tools } from "@ghostpaw/affinity";
import type { Tool } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";

/**
 * Bridges an affinity AffinityToolDefinition into a chatoyant-compatible Tool.
 *
 * Chatoyant's Chat class only uses four surface methods from Tool at runtime:
 * .name, .description, .getParametersSchema(), .executeCall(). We create a
 * duck-typed object that satisfies these without fighting the Schema system,
 * since affinity already provides inputSchema as standard JSON Schema.
 */
function bridgeAffinityTool(
  toolDef: (typeof tools.affinityTools)[number],
  db: DatabaseHandle,
): Tool {
  return {
    name: toolDef.name,
    description: toolDef.description,
    getParametersSchema() {
      return {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        ...toolDef.inputSchema,
      };
    },
    async executeCall(call: { id: string; name: string; args: unknown }) {
      let raw: unknown;
      try {
        // biome-ignore lint/suspicious/noExplicitAny: affinity handler expects specific union type from LLM-parsed args
        raw = toolDef.handler(db as any, call.args as any);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { id: call.id, result: msg, success: false };
      }
      const result = typeof raw === "string" ? raw : (JSON.stringify(raw) ?? "{}");
      const ok =
        typeof raw === "object" && raw !== null && "ok" in raw ? (raw as { ok: boolean }).ok : true;
      return {
        id: call.id,
        result,
        error: ok ? undefined : result,
        success: ok,
      };
    },
    // biome-ignore lint/suspicious/noExplicitAny: duck-typed shim — unused by chatoyant runtime
  } as any;
}

export function bridgeAffinityTools(db: DatabaseHandle): Tool[] {
  return tools.affinityTools.map((toolDef) =>
    // biome-ignore lint/suspicious/noExplicitAny: heterogeneous tool definitions
    bridgeAffinityTool(toolDef as any, db),
  );
}
