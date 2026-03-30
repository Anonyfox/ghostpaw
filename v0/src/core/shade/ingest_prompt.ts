const INGEST_SYSTEM_PROMPT = `You observe AI agent behavior to surface what it reveals about how the agent thinks — its judgment, reasoning style, approach to problems, and recurring patterns. You are not looking for spectacular moments. You are looking for moments that teach something about cognitive character.

What counts as notable:
- Judgment under ambiguity — the agent chose between reasonable alternatives without clear instructions, and the choice reveals a reasoning preference.
- Knowledge integration — connected facts from different sources or conversation turns to reach a conclusion the user did not spell out.
- Self-correction or course change — noticed something was wrong and adjusted, or abandoned a failing approach.
- Proactive structure — offered disambiguation, flagged risks, or organized information the user did not ask for.
- Subsystem decision-making — a specialist resolved competing options, handled identity ambiguity, or navigated an edge case in a way that reveals approach, not just outcome. Tool call sequences are especially telling: did it search before creating? Did it verify before merging?
- Genuine weakness — a clear miss, hallucination, misattribution, or failure to connect obvious dots.

What is NOT notable:
- Correct answers to straightforward questions. That is baseline.
- Following instructions as given. That is the job.
- Style, formatting, or politeness. Not behavioral signal.
- Trivial tasks executed trivially.
- A subsystem completing its job without interesting decisions.

Rules:
- Write each impression as a single plain-text paragraph.
- Separate impressions with one blank line.
- Each impression must be self-contained and include a brief evidence quote in brackets.
- Prefer (none) over vague or generic observations. A good impression is specific enough that someone reading it would learn something about how this agent thinks.
- If there is nothing genuinely notable, respond with exactly: (none)`;

import type { SegmentMessage, SegmentToolInfo } from "./load_segment_messages.ts";

const TOOL_RESULT_CAP = 200;

function extractToolSummary(json: string): string {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed?.summary === "string") return parsed.summary;
  } catch {
    /* non-JSON tool result — use raw content */
  }
  return json.length > TOOL_RESULT_CAP ? `${json.slice(0, TOOL_RESULT_CAP)}…` : json;
}

function compactToolNames(names: string[]): string {
  const counts = new Map<string, number>();
  for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
  return [...counts.entries()].map(([n, c]) => (c > 1 ? `${n} x${c}` : n)).join(", ");
}

export function formatSegmentForIngest(
  messages: SegmentMessage[],
  toolInfo?: SegmentToolInfo,
): string {
  const lines: string[] = [];

  for (const m of messages) {
    if (m.role === "tool") {
      const toolName =
        m.tool_call_id && toolInfo ? (toolInfo.nameOf.get(m.tool_call_id) ?? "unknown") : "unknown";
      const summary = extractToolSummary(m.content);
      lines.push(`[tool result: ${toolName}] ${summary}`);
      continue;
    }

    if (m.role === "assistant") {
      const called = toolInfo?.calledBy.get(m.msg_id);
      const prefix = called ? `assistant (called: ${compactToolNames(called)})` : "assistant";
      const label = m.is_compaction ? "[compaction summary]" : prefix;
      const body = m.content.trim();
      if (body.length === 0 && called) {
        lines.push(`${label}:`);
      } else {
        const capped = body.length > 2000 ? `${body.slice(0, 2000)}…` : body;
        lines.push(`${label}: ${capped}`);
      }
      continue;
    }

    const label = m.is_compaction ? "[compaction summary]" : m.role;
    const body = m.content.length > 2000 ? `${m.content.slice(0, 2000)}…` : m.content;
    lines.push(`${label}: ${body}`);
  }

  return lines.join("\n\n");
}

export function buildIngestPrompt(
  messages: SegmentMessage[],
  toolInfo?: SegmentToolInfo,
): string {
  return `Here is the conversation segment to analyze:\n\n${formatSegmentForIngest(messages, toolInfo)}`;
}

export { INGEST_SYSTEM_PROMPT };
