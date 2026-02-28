import { lexer, type Token, type Tokens } from "marked";
import { style } from "../../lib/terminal/index.ts";

export function renderMarkdown(text: string): string {
  const tokens = lexer(text);
  return renderTokens(tokens);
}

function renderTokens(tokens: Token[]): string {
  const parts: string[] = [];
  for (const token of tokens) {
    parts.push(renderToken(token));
  }
  return parts.join("");
}

function renderToken(token: Token): string {
  switch (token.type) {
    case "paragraph":
      return `${renderInline((token as Tokens.Paragraph).tokens ?? [])}\n`;
    case "heading":
      return `${style.bold(renderInline((token as Tokens.Heading).tokens ?? []))}\n`;
    case "code":
      return renderCodeBlock(token as Tokens.Code);
    case "blockquote":
      return renderBlockquote(token as Tokens.Blockquote);
    case "list":
      return renderList(token as Tokens.List);
    case "space":
      return "\n";
    case "hr":
      return "---\n";
    default:
      if ("text" in token && typeof token.text === "string") {
        return `${token.text}\n`;
      }
      return "";
  }
}

function renderInline(tokens: Token[]): string {
  const parts: string[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case "strong":
        parts.push(style.bold(renderInline((token as Tokens.Strong).tokens ?? [])));
        break;
      case "em":
        parts.push(style.italic(renderInline((token as Tokens.Em).tokens ?? [])));
        break;
      case "codespan":
        parts.push(style.cyan((token as Tokens.Codespan).text));
        break;
      case "link":
        parts.push(
          `${renderInline((token as Tokens.Link).tokens ?? [])} ${style.dim(`(${(token as Tokens.Link).href})`)}`,
        );
        break;
      case "br":
        parts.push("\n");
        break;
      default:
        if ("text" in token && typeof token.text === "string") {
          parts.push(token.text);
        } else if ("raw" in token && typeof token.raw === "string") {
          parts.push(token.raw);
        }
        break;
    }
  }
  return parts.join("");
}

function renderCodeBlock(token: Tokens.Code): string {
  const header = token.lang ? style.dim(`  [${token.lang}]`) : "";
  const lines = token.text.split("\n");
  const body = lines.map((l) => `  ${style.cyan(l)}`).join("\n");
  return `${header}\n${body}\n\n`;
}

function renderBlockquote(token: Tokens.Blockquote): string {
  const inner = renderTokens(token.tokens ?? []);
  return inner
    .split("\n")
    .map((l) => `${style.dim("|")} ${l}`)
    .join("\n");
}

function renderList(token: Tokens.List): string {
  const parts: string[] = [];
  for (let i = 0; i < token.items.length; i++) {
    const item = token.items[i]!;
    const bullet = token.ordered ? `${(token.start || 1) + i}. ` : "- ";
    const text = renderInline(
      item.tokens?.[0]?.type === "text" ? ((item.tokens[0] as Tokens.Text).tokens ?? []) : [],
    );
    parts.push(`  ${bullet}${text || item.text}`);
  }
  return `${parts.join("\n")}\n`;
}
