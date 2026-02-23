import { ToolError } from "./errors.js";

export interface MatchResult {
  kind: "exact" | "fuzzy" | "ambiguous" | "none";
  index?: number;
  matchedText?: string;
  count?: number;
}

function normalizeWhitespace(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .trim();
}

function allOccurrences(haystack: string, needle: string): number[] {
  const indices: number[] = [];
  let pos = 0;
  while (pos <= haystack.length - needle.length) {
    const idx = haystack.indexOf(needle, pos);
    if (idx === -1) break;
    indices.push(idx);
    pos = idx + 1;
  }
  return indices;
}

function fuzzyFind(content: string, search: string): MatchResult {
  const normalizedSearch = normalizeWhitespace(search);
  if (normalizedSearch.length === 0) return { kind: "none" };

  const lines = content.split("\n");
  const searchLines = normalizedSearch.split("\n");
  const searchLineCount = searchLines.length;

  let bestStart = -1;
  let bestEnd = -1;

  for (let i = 0; i <= lines.length - searchLineCount; i++) {
    let match = true;
    for (let j = 0; j < searchLineCount; j++) {
      const contentLine = lines[i + j]!.replace(/[ \t]+/g, " ").trim();
      if (contentLine !== searchLines[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      if (bestStart !== -1) {
        return { kind: "ambiguous", count: 2 };
      }
      bestStart = i;
      bestEnd = i + searchLineCount;
    }
  }

  if (bestStart === -1) return { kind: "none" };

  const matchedLines = lines.slice(bestStart, bestEnd);
  const matchedText = matchedLines.join("\n");
  let index = 0;
  for (let i = 0; i < bestStart; i++) {
    index += lines[i]!.length + 1;
  }

  return { kind: "fuzzy", index, matchedText };
}

export function findUniqueMatch(content: string, search: string): MatchResult {
  if (!search || !content) return { kind: "none" };

  const indices = allOccurrences(content, search);

  if (indices.length === 1) {
    return { kind: "exact", index: indices[0], matchedText: search };
  }

  if (indices.length > 1) {
    return { kind: "ambiguous", count: indices.length };
  }

  return fuzzyFind(content, search);
}

export interface ReplaceResult {
  newContent: string;
  matchKind: "exact" | "fuzzy";
}

export function findAndReplace(
  content: string,
  search: string,
  replacement: string,
): ReplaceResult {
  const match = findUniqueMatch(content, search);

  switch (match.kind) {
    case "exact":
      return {
        newContent:
          content.slice(0, match.index!) +
          replacement +
          content.slice(match.index! + search.length),
        matchKind: "exact",
      };

    case "fuzzy":
      return {
        newContent:
          content.slice(0, match.index!) +
          replacement +
          content.slice(match.index! + match.matchedText!.length),
        matchKind: "fuzzy",
      };

    case "ambiguous":
      throw new ToolError(
        "edit",
        `Search string has ${match.count} matches — must be unique. Add more surrounding context.`,
        { hint: "Include additional lines before/after the target to make the match unique." },
      );

    case "none":
      throw new ToolError("edit", `Search string not found in file content.`, {
        hint: "Verify the search string matches the file content exactly, including whitespace.",
      });
  }
}
