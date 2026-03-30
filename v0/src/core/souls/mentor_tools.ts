import {
  type SoulsDb,
  type SoulsToolDefinition,
  tools as soulsToolsNs,
  type ToolResult,
} from "@ghostpaw/souls";
import type { Tool } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";

/**
 * Duck-typed tool that satisfies chatoyant's Chat._tools expectations
 * without requiring chatoyant's Schema system for parameters.
 *
 * Chat only calls: .name, .description, .getParametersSchema(), .executeCall()
 *
 * Souls handlers return structured ToolResult (ok/summary/data). These are
 * passed through as success:true so the LLM sees the full rich response,
 * including ok:false cases with recovery hints. Only unexpected throws
 * map to success:false.
 */
class BridgedSoulsTool {
  readonly name: string;
  readonly description: string;
  private readonly schema: Record<string, unknown>;
  private readonly handler: (db: SoulsDb, input: unknown) => ToolResult;
  private readonly db: SoulsDb;

  constructor(def: SoulsToolDefinition<unknown, unknown>, db: SoulsDb) {
    this.name = def.name;
    this.description = def.description;
    this.schema = def.inputSchema as Record<string, unknown>;
    this.handler = def.handler as (db: SoulsDb, input: unknown) => ToolResult;
    this.db = db;
  }

  getParametersSchema(): Record<string, unknown> {
    return {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      ...this.schema,
    };
  }

  async executeCall(
    call: { id: string; name: string; args: unknown },
    _ctx: unknown,
    _timeoutOverride?: number,
  ): Promise<{ id: string; result: unknown; success: boolean; error?: string }> {
    try {
      const result = this.handler(this.db, call.args);
      return { id: call.id, result, success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { id: call.id, result: null, success: false, error: message };
    }
  }
}

/**
 * Bridges all `@ghostpaw/souls` tool definitions to chatoyant-compatible tools,
 * binding each handler to the given soulsDb.
 */
export function createMentorTools(soulsDb: DatabaseHandle): Tool[] {
  const db = soulsDb as unknown as SoulsDb;
  return soulsToolsNs.soulsTools.map((def) => new BridgedSoulsTool(def, db) as unknown as Tool);
}
