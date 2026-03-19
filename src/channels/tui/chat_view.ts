import { style } from "../../lib/terminal/index.ts";
import { renderMarkdown } from "./render_markdown.ts";
import { wrapText } from "./wrap_text.ts";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

export function renderChatMessages(messages: ChatMessage[], width: number): string[] {
  const lines: string[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!;
    const num = style.dim(`${String(i + 1).padStart(3)}|`);
    lines.push("");
    if (msg.role === "user") {
      lines.push(`${num} ${style.bold("you:")}`);
      for (const line of wrapText(msg.content, width - 6)) {
        lines.push(`     ${line}`);
      }
    } else {
      lines.push(`${num} ${style.boldCyan("ghostpaw:")}`);
      const rendered = renderMarkdown(msg.content);
      for (const raw of rendered.split("\n")) {
        for (const line of wrapText(raw, width - 6)) {
          lines.push(`     ${line}`);
        }
      }
    }
  }
  return lines;
}

export function renderStreamChunk(chunk: string, width: number): string[] {
  const lines: string[] = [];
  for (const raw of chunk.split("\n")) {
    if (raw.length === 0 && chunk.includes("\n")) {
      lines.push("");
      continue;
    }
    for (const line of wrapText(raw, width - 2)) {
      lines.push(`  ${line}`);
    }
  }
  return lines;
}
