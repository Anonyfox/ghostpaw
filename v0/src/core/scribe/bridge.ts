import type { CodexDb } from "@ghostpaw/codex";
import { tools } from "@ghostpaw/codex";
import type { Tool } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";

/**
 * Bridges a codex CodexToolDefinition into a chatoyant-compatible Tool.
 *
 * Chatoyant's Chat class only uses four surface methods from Tool at runtime:
 * .name, .description, .getParametersSchema(), .executeCall(). We create a
 * duck-typed object that satisfies these without fighting the Schema system,
 * since codex already provides inputSchema as standard JSON Schema.
 */
function bridgeCodexTool(toolDef: (typeof tools.codexTools)[number], db: DatabaseHandle): Tool {
  const codexDb = db as unknown as CodexDb;
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
      // biome-ignore lint/suspicious/noExplicitAny: codex handler expects specific union type from LLM-parsed args
      const result = toolDef.handler(codexDb, call.args as any);
      return {
        id: call.id,
        result,
        success:
          typeof result === "object" && result !== null && "ok" in result
            ? (result as { ok: boolean }).ok
            : true,
      };
    },
    // biome-ignore lint/suspicious/noExplicitAny: duck-typed shim — unused by chatoyant runtime
  } as any;
}

export function bridgeCodexTools(db: DatabaseHandle): Tool[] {
  return tools.codexTools.map((toolDef) =>
    // biome-ignore lint/suspicious/noExplicitAny: heterogeneous tool definitions
    bridgeCodexTool(toolDef as any, db),
  );
}
