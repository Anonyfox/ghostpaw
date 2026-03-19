const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&#x27;": "'",
  "&#x2F;": "/",
};

const HTML_ENTITY_DETECT = /&(?:amp|lt|gt|quot|apos|#39|#x27|#x2F);/;
const HTML_ENTITY_REPLACE = /&(?:amp|lt|gt|quot|apos|#39|#x27|#x2F);/g;

function hasHtmlEntities(text: string): boolean {
  return HTML_ENTITY_DETECT.test(text);
}

function unescapeHtmlEntities(text: string): string {
  return text.replace(HTML_ENTITY_REPLACE, (m) => HTML_ENTITIES[m] ?? m);
}

function hasLiteralEscapes(text: string): boolean {
  return text.includes("\\n") && !text.includes("\n");
}

function unescapeLiteralSequences(text: string): string {
  return text.replaceAll("\\n", "\n");
}

export function sanitizeLlmContent(content: string, filePath: string): string {
  if (!content || content.length < 2) return content;

  const isHtml = /\.html?$/i.test(filePath);
  let result = content;

  if (!isHtml && hasHtmlEntities(result)) {
    result = unescapeHtmlEntities(result);
  }

  if (hasLiteralEscapes(result)) {
    result = unescapeLiteralSequences(result);
  }

  return result;
}
