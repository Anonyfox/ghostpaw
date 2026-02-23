/**
 * Filters chatoyant's raw stream to replace tool_call/tool_result/tool_response
 * XML blocks with clean terminal indicators. Handles chunks of any size,
 * including partial tags split across multiple chunks.
 */

const OPEN_TAGS = ["<tool_call>", "<tool_use>"] as const;
const CLOSE_CALL_TAGS = ["</tool_call>", "</tool_use>"] as const;
const OPEN_RESULT_TAGS = ["<tool_result>", "<tool_response>"] as const;
const CLOSE_RESULT_TAGS = ["</tool_result>", "</tool_response>"] as const;

const ALL_TAGS = [...OPEN_TAGS, ...CLOSE_CALL_TAGS, ...OPEN_RESULT_TAGS, ...CLOSE_RESULT_TAGS];

const MAX_TAG_LEN = Math.max(...ALL_TAGS.map((t) => t.length));

type State = "text" | "tool_call" | "tool_result";

export class StreamFormatter {
  private buffer = "";
  private state: State = "text";

  push(chunk: string): string {
    this.buffer += chunk;
    return this.drain();
  }

  flush(): string {
    const out = this.state === "text" ? this.buffer : "";
    this.buffer = "";
    this.state = "text";
    return out;
  }

  private drain(): string {
    let output = "";

    for (;;) {
      if (this.state === "tool_call") {
        const end = this.findFirst(CLOSE_CALL_TAGS);
        if (!end) return output;
        const body = this.buffer.slice(0, end.index).trim();
        this.buffer = this.buffer.slice(end.index + end.tag.length);
        output += this.formatToolCall(body);
        this.state = "text";
        continue;
      }

      if (this.state === "tool_result") {
        const end = this.findFirst(CLOSE_RESULT_TAGS);
        if (!end) return output;
        this.buffer = this.buffer.slice(end.index + end.tag.length);
        output += "done\n";
        this.state = "text";
        continue;
      }

      // state === "text"
      const openCall = this.findFirst(OPEN_TAGS);
      const openResult = this.findFirst(OPEN_RESULT_TAGS);

      const next = minMatch(openCall, openResult);

      if (!next) {
        const safe = this.safeFlushLength();
        if (safe > 0) {
          output += this.buffer.slice(0, safe);
          this.buffer = this.buffer.slice(safe);
        }
        return output;
      }

      if (next.index > 0) {
        output += this.buffer.slice(0, next.index);
      }

      const isCall = openCall && next.index === openCall.index && next.tag === openCall.tag;
      this.buffer = this.buffer.slice(next.index + next.tag.length);
      this.state = isCall ? "tool_call" : "tool_result";
    }
  }

  private findFirst(tags: readonly string[]): { index: number; tag: string } | null {
    let best: { index: number; tag: string } | null = null;
    for (const tag of tags) {
      const idx = this.buffer.indexOf(tag);
      if (idx >= 0 && (!best || idx < best.index)) {
        best = { index: idx, tag };
      }
    }
    return best;
  }

  private safeFlushLength(): number {
    const len = this.buffer.length;
    if (len === 0) return 0;

    const searchFrom = Math.max(0, len - MAX_TAG_LEN);
    const lastLt = this.buffer.indexOf("<", searchFrom);

    if (lastLt < 0) return len;

    const tail = this.buffer.slice(lastLt);
    for (const tag of ALL_TAGS) {
      if (tag.startsWith(tail)) return lastLt;
    }

    return len;
  }

  private formatToolCall(body: string): string {
    // Try JSON with common key names
    try {
      const parsed = JSON.parse(body);
      const name = parsed.name ?? parsed.tool ?? parsed.function ?? null;
      if (name) return `  [${name}] `;
    } catch {
      // not JSON
    }

    // Try extracting first non-empty line as tool name
    const firstLine = body
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0);
    if (firstLine && firstLine.length < 40 && !firstLine.includes("{")) {
      return `  [${firstLine}] `;
    }

    return "  [tool] ";
  }
}

function minMatch(
  a: { index: number; tag: string } | null,
  b: { index: number; tag: string } | null,
): { index: number; tag: string } | null {
  if (!a) return b;
  if (!b) return a;
  return a.index <= b.index ? a : b;
}
