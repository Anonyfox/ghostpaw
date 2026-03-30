import { tools } from "@ghostpaw/affinity";
import type { Tool } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";

// biome-ignore lint/suspicious/noExplicitAny: bridge-layer argument normalization for LLM-generated JSON
type AnyArgs = Record<string, any>;

/**
 * LLMs commonly flatten `target.contact.contactId` to `target.contactId`
 * when calling manage_attribute. Normalize the flat form into what the
 * handler expects before it hits the schema validator.
 */
export function normalizeAttributeArgs(args: AnyArgs): AnyArgs {
  const target = args.target;
  if (!target || typeof target !== "object") return args;
  if (target.kind === "contact" && !target.contact && target.contactId != null) {
    return { ...args, target: { kind: "contact", contact: { contactId: target.contactId } } };
  }
  if (target.kind === "link" && !target.link && target.linkId != null) {
    return { ...args, target: { kind: "link", link: { linkId: target.linkId } } };
  }
  return args;
}

const ARG_NORMALIZERS: Record<string, (args: AnyArgs) => AnyArgs> = {
  manage_attribute: normalizeAttributeArgs,
};

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
        const normalizer = ARG_NORMALIZERS[call.name];
        const args = normalizer ? normalizer(call.args as AnyArgs) : call.args;
        // biome-ignore lint/suspicious/noExplicitAny: affinity handler expects specific union type from LLM-parsed args
        raw = toolDef.handler(db as any, args as any);
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
