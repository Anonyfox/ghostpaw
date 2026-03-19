export interface PersistedToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface PersistedToolCallMessageData {
  kind: "tool_call";
  calls: PersistedToolCall[];
}

export interface PersistedToolResultMessageData {
  kind: "tool_result";
  toolCallId: string | null;
  success: boolean | null;
  error: string | null;
}

export function serializeToolCallData(calls: PersistedToolCall[]): string {
  const payload: PersistedToolCallMessageData = {
    kind: "tool_call",
    calls,
  };
  return JSON.stringify(payload);
}

export function serializeToolResultData(input: {
  toolCallId: string | null;
  success?: boolean | null;
  error?: string | null;
}): string {
  const payload: PersistedToolResultMessageData = {
    kind: "tool_result",
    toolCallId: input.toolCallId,
    success: input.success ?? null,
    error: input.error ?? null,
  };
  return JSON.stringify(payload);
}

export function parseToolCallData(toolData: string | null): PersistedToolCall[] {
  if (!toolData) return [];

  try {
    const parsed = JSON.parse(toolData) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.flatMap(normalizeLegacyToolCallEntry);
    }

    if (isToolCallMessageData(parsed)) {
      return parsed.calls.flatMap(normalizeLegacyToolCallEntry);
    }

    return normalizeLegacyToolCallEntry(parsed);
  } catch {
    return [];
  }
}

export function parseToolResultData(
  toolData: string | null,
): PersistedToolResultMessageData | null {
  if (!toolData) return null;

  try {
    const parsed = JSON.parse(toolData) as unknown;
    if (isToolResultMessageData(parsed)) {
      return parsed;
    }

    const record = asRecord(parsed);
    if (record && ("toolCallId" in record || "tool_call_id" in record)) {
      const toolCallId =
        typeof record.toolCallId === "string"
          ? record.toolCallId
          : typeof record.tool_call_id === "string"
            ? record.tool_call_id
            : null;
      return {
        kind: "tool_result",
        toolCallId,
        success: typeof record.success === "boolean" ? record.success : null,
        error: typeof record.error === "string" ? record.error : null,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function isToolCallMessageData(value: unknown): value is PersistedToolCallMessageData {
  const record = asRecord(value);
  return record?.kind === "tool_call" && Array.isArray(record.calls);
}

function isToolResultMessageData(value: unknown): value is PersistedToolResultMessageData {
  const record = asRecord(value);
  return record?.kind === "tool_result" && ("toolCallId" in record || record.toolCallId === null);
}

function normalizeLegacyToolCallEntry(value: unknown): PersistedToolCall[] {
  const record = asRecord(value);
  if (!record) return [];
  if (typeof record.id !== "string") return [];
  if (typeof record.name !== "string") return [];

  return [
    {
      id: record.id,
      name: record.name,
      arguments:
        typeof record.arguments === "string"
          ? record.arguments
          : JSON.stringify(record.arguments ?? {}),
    },
  ];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}
