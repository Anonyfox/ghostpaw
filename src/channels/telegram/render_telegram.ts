import { lexer, type Token, type Tokens } from "marked";

const TABLE_WIDTH_THRESHOLD = 35;

export function renderTelegramHtml(markdown: string): string {
  if (!markdown) return "";
  const tokens = lexer(markdown);
  return renderTokens(tokens).trim();
}

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
      return `<b>${renderInline((token as Tokens.Heading).tokens ?? [])}</b>\n\n`;
    case "code":
      return renderCodeBlock(token as Tokens.Code);
    case "blockquote":
      return renderBlockquote(token as Tokens.Blockquote);
    case "list":
      return renderList(token as Tokens.List);
    case "table":
      return renderTable(token as Tokens.Table);
    case "space":
      return "\n";
    case "hr":
      return "---\n";
    default:
      if ("text" in token && typeof token.text === "string") {
        return `${esc(token.text)}\n`;
      }
      return "";
  }
}

function renderInline(tokens: Token[]): string {
  const parts: string[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case "strong":
        parts.push(`<b>${renderInline((token as Tokens.Strong).tokens ?? [])}</b>`);
        break;
      case "em":
        parts.push(`<i>${renderInline((token as Tokens.Em).tokens ?? [])}</i>`);
        break;
      case "codespan":
        parts.push(`<code>${esc((token as Tokens.Codespan).text)}</code>`);
        break;
      case "del":
        parts.push(`<s>${renderInline((token as Tokens.Del).tokens ?? [])}</s>`);
        break;
      case "link": {
        const lt = token as Tokens.Link;
        parts.push(`<a href="${esc(lt.href)}">${renderInline(lt.tokens ?? [])}</a>`);
        break;
      }
      case "image": {
        const it = token as Tokens.Image;
        parts.push(`<a href="${esc(it.href)}">${esc(it.text || it.href)}</a>`);
        break;
      }
      case "br":
        parts.push("\n");
        break;
      default:
        if ("text" in token && typeof token.text === "string") {
          parts.push(esc(token.text));
        } else if ("raw" in token && typeof token.raw === "string") {
          parts.push(esc(token.raw));
        }
        break;
    }
  }
  return parts.join("");
}

function renderCodeBlock(token: Tokens.Code): string {
  if (token.lang) {
    return `<pre><code class="${esc(token.lang)}">${esc(token.text)}</code></pre>\n`;
  }
  return `<pre>${esc(token.text)}</pre>\n`;
}

function renderBlockquote(token: Tokens.Blockquote): string {
  const inner = renderTokens(token.tokens ?? []).trim();
  return `<blockquote>${inner}</blockquote>\n`;
}

function renderList(token: Tokens.List): string {
  const parts: string[] = [];
  for (let i = 0; i < token.items.length; i++) {
    const item = token.items[i]!;
    const bullet = token.ordered ? `${(token.start || 1) + i}. ` : "• ";
    const text = renderInline(
      item.tokens?.[0]?.type === "text" ? ((item.tokens[0] as Tokens.Text).tokens ?? []) : [],
    );
    parts.push(`${bullet}${text || esc(item.text)}`);
  }
  return `${parts.join("\n")}\n`;
}

function cellText(cell: Tokens.TableCell): string {
  return cell.text;
}

function renderTable(token: Tokens.Table): string {
  const headers = token.header.map(cellText);
  const rows = token.rows.map((row) => row.map(cellText));

  const colWidths = headers.map((h) => h.length);
  for (const row of rows) {
    for (let c = 0; c < row.length; c++) {
      colWidths[c] = Math.max(colWidths[c] ?? 0, (row[c] ?? "").length);
    }
  }

  const totalWidth = colWidths.reduce((sum, w) => sum + w, 0) + (colWidths.length - 1) * 3;

  if (totalWidth <= TABLE_WIDTH_THRESHOLD) {
    return renderTableMonospace(headers, rows, colWidths, token.align);
  }
  if (headers.length === 2) {
    return renderTableKeyValue(headers, rows);
  }
  return renderTableCards(headers, rows);
}

function pad(text: string, width: number, align: "left" | "right" | "center" | null): string {
  const gap = width - text.length;
  if (gap <= 0) return text;
  if (align === "right") return " ".repeat(gap) + text;
  if (align === "center") {
    const left = Math.floor(gap / 2);
    return " ".repeat(left) + text + " ".repeat(gap - left);
  }
  return text + " ".repeat(gap);
}

function renderTableMonospace(
  headers: string[],
  rows: string[][],
  colWidths: number[],
  aligns: Array<"left" | "right" | "center" | null>,
): string {
  const headerLine = headers.map((h, i) => pad(h, colWidths[i]!, aligns[i]!)).join(" | ");
  const sepLine = colWidths.map((w) => "-".repeat(w)).join("-|-");
  const bodyLines = rows.map((row) =>
    row.map((cell, i) => pad(cell, colWidths[i]!, aligns[i]!)).join(" | "),
  );
  return `<pre>${esc(headerLine)}\n${esc(sepLine)}\n${bodyLines.map(esc).join("\n")}</pre>\n`;
}

function renderTableKeyValue(_headers: string[], rows: string[][]): string {
  const parts: string[] = [];
  for (const row of rows) {
    parts.push(`<b>${esc(row[0] ?? "")}</b>: ${esc(row[1] ?? "")}`);
  }
  return `${parts.join("\n")}\n`;
}

function renderTableCards(headers: string[], rows: string[][]): string {
  const parts: string[] = [];
  for (const row of rows) {
    const title = row[0] ?? "";
    const fields: string[] = [];
    for (let c = 1; c < headers.length; c++) {
      const val = row[c] ?? "";
      if (val) fields.push(`  ${esc(headers[c]!)}: ${esc(val)}`);
    }
    parts.push(`▸ <b>${esc(title)}</b>\n${fields.join("\n")}`);
  }
  return `${parts.join("\n\n")}\n`;
}
