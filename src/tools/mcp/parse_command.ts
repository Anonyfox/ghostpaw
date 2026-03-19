export function parseCommand(server: string): { command: string; args: string[] } {
  const trimmed = server.trim();
  if (!trimmed) {
    throw new Error("MCP server command is empty. Provide a command like 'npx -y @mcp/server'.");
  }

  const parts: string[] = [];
  let current = "";
  let quote: string | null = null;

  for (const ch of trimmed) {
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === " " || ch === "\t") {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);

  if (parts.length === 0) {
    throw new Error("MCP server command is empty. Provide a command like 'npx -y @mcp/server'.");
  }

  return { command: parts[0], args: parts.slice(1) };
}
