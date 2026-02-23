import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createTool, Schema } from "chatoyant";
import { estimateTokens } from "../core/cost.js";

const TOKEN_INLINE_THRESHOLD = 3000;

class WebFetchParams extends Schema {
  url = Schema.String({ description: "URL to fetch" });
  mode = Schema.Enum(["article", "text", "metadata", "html"] as const, {
    description:
      "article: clean readable content (default); text: full plaintext including nav/widgets; metadata: title + links + feeds only; html: raw source",
    optional: true,
  });
}

export function smartReturn(
  content: string,
  workspacePath: string,
  metadata: Record<string, unknown>,
  ext = ".txt",
) {
  const tokens = estimateTokens(content);

  if (tokens <= TOKEN_INLINE_THRESHOLD) {
    return { ...metadata, content };
  }

  const hash = createHash("sha256").update(content).digest("hex").slice(0, 12);
  const filePath = join(".ghostpaw", "web", `${hash}${ext}`);
  const fullPath = join(workspacePath, filePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf-8");

  const lines = content.split("\n");
  const preview = lines.slice(0, 20).join("\n") + (lines.length > 20 ? "\n... (truncated)" : "");

  return {
    ...metadata,
    totalLines: lines.length,
    totalTokens: tokens,
    filePath,
    preview,
    hint: `Full content saved to ${filePath}. Use 'read' or 'bash' tools for granular inspection.`,
  };
}

export interface MagpieApi {
  // biome-ignore lint: loose types for compat with magpie-html's class instances
  gatherArticle(url: string): Promise<any>;
  // biome-ignore lint: loose types for compat with magpie-html's class instances
  gatherWebsite(url: string): Promise<any>;
  // biome-ignore lint: loose types for compat with magpie-html's class instances
  pluck(url: string): Promise<any>;
}

export function createWebFetchTool(workspacePath: string, magpieOverride?: MagpieApi) {
  return createTool({
    name: "web_fetch",
    description:
      "Fetch and extract content from a URL. Modes: 'article' (clean readable content), " +
      "'text' (full plaintext), 'metadata' (title + links + feeds), 'html' (raw source). " +
      "Large results are saved to a file for granular inspection via read/bash.",
    // biome-ignore lint: TS index-signature limitation on class instances vs SchemaInstance
    parameters: new WebFetchParams() as any,
    execute: async ({ args }) => {
      const { url, mode = "article" } = args as {
        url: string;
        mode?: "article" | "text" | "metadata" | "html";
      };
      const magpie: MagpieApi = magpieOverride ?? (await import("magpie-html"));

      try {
        switch (mode) {
          case "metadata": {
            const site = await magpie.gatherWebsite(url);
            return {
              url: site.url,
              title: site.title,
              description: site.description,
              image: site.image,
              language: site.language,
              feeds: site.feeds,
              internalLinks: ((site.internalLinks as string[]) ?? []).slice(0, 20),
              externalLinks: ((site.externalLinks as string[]) ?? []).slice(0, 20),
            };
          }
          case "article": {
            const article = await magpie.gatherArticle(url);
            const body = (article.content as string) ?? (article.text as string) ?? "";
            return smartReturn(body, workspacePath, {
              url: article.url,
              title: article.title,
              description: article.description,
              wordCount: article.wordCount,
              readingTime: article.readingTime,
              links: ((article.externalLinks as string[]) ?? []).slice(0, 10),
            });
          }
          case "text": {
            const site = await magpie.gatherWebsite(url);
            return smartReturn((site.text as string) ?? "", workspacePath, {
              url: site.url,
              title: site.title,
            });
          }
          case "html": {
            const response = await magpie.pluck(url);
            const html = await response.textUtf8();
            return smartReturn(html, workspacePath, { url: response.finalUrl }, ".html");
          }
          default:
            return { error: `Unknown mode: ${mode}` };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: `Failed to fetch "${url}": ${msg}` };
      }
    },
  });
}
