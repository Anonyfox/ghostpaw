import type { McpToolSchema } from "./types.ts";

export function formatToolSchema(tool: McpToolSchema): Record<string, unknown> {
  const params: Record<string, string> = {};
  const props = tool.inputSchema?.properties ?? {};
  const required = new Set(tool.inputSchema?.required ?? []);

  for (const [k, v] of Object.entries(props)) {
    params[k] = `${v.type ?? "unknown"}${required.has(k) ? " (required)" : " (optional)"}`;
  }

  const result: Record<string, unknown> = {
    name: tool.name,
    description: tool.description ?? "",
    parameters: params,
  };

  if (tool.annotations) {
    const hints: Record<string, boolean> = {};
    let hasHints = false;
    if (tool.annotations.readOnlyHint != null) {
      hints.readOnly = tool.annotations.readOnlyHint;
      hasHints = true;
    }
    if (tool.annotations.destructiveHint != null) {
      hints.destructive = tool.annotations.destructiveHint;
      hasHints = true;
    }
    if (tool.annotations.idempotentHint != null) {
      hints.idempotent = tool.annotations.idempotentHint;
      hasHints = true;
    }
    if (hasHints) result.hints = hints;
  }

  return result;
}
