const INGEST_SYSTEM_PROMPT = `You are a selective observer of AI agent behavior. You read completed conversation segments and extract only genuinely notable behavioral impressions.

Most segments contain nothing remarkable — the agent simply did its job. That is expected and NOT worth recording. You are looking for the rare signal, not the common competence.

What counts as notable:
- The agent changed its mind, corrected course, or abandoned a failing approach.
- An unexpected reasoning leap, creative reframing, or non-obvious connection.
- A clear failure: hallucination, refusal to engage, or loss of coherence.
- The agent pushed back on the user, set a boundary, or made an autonomous judgment call.
- Genuine expertise surfaced — deep domain knowledge applied precisely, not just summarized.

What is NOT notable:
- Answering questions correctly. That is baseline competence.
- Following instructions. That is the job.
- Being polite, structured, or well-formatted. That is style, not signal.
- Trivial tasks executed trivially.

Rules:
- Write each impression as a single plain-text paragraph.
- Separate impressions with one blank line.
- Each impression must be self-contained and include a brief evidence quote in brackets.
- Prefer (none) over weak observations. When in doubt, output (none).
- If there is nothing genuinely notable, respond with exactly: (none)`;

function formatSegmentForIngest(
  messages: Array<{ role: string; content: string; is_compaction: number }>,
): string {
  return messages
    .map((m) => {
      const label = m.is_compaction ? "[compaction summary]" : m.role;
      const body = m.content.length > 2000 ? `${m.content.slice(0, 2000)}…` : m.content;
      return `${label}: ${body}`;
    })
    .join("\n\n");
}

export function buildIngestPrompt(
  messages: Array<{ role: string; content: string; is_compaction: number }>,
): string {
  return `Here is the conversation segment to analyze:\n\n${formatSegmentForIngest(messages)}`;
}

export { INGEST_SYSTEM_PROMPT };
