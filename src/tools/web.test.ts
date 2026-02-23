import { ok, strictEqual } from "node:assert";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { createWebFetchTool, type MagpieApi, smartReturn } from "./web.js";

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "ghostpaw-web-"));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

// ── smartReturn tests ────────────────────────────────────────────────────────

describe("smartReturn - inline mode", () => {
  it("returns content inline when under token threshold", () => {
    const result = smartReturn("short content", workDir, { title: "Test" }) as {
      content: string;
      title: string;
    };
    strictEqual(result.content, "short content");
    strictEqual(result.title, "Test");
    ok(!("filePath" in result));
  });

  it("preserves all metadata fields", () => {
    const result = smartReturn("hi", workDir, { a: 1, b: "two", c: true }) as Record<
      string,
      unknown
    >;
    strictEqual(result.a, 1);
    strictEqual(result.b, "two");
    strictEqual(result.c, true);
    strictEqual(result.content, "hi");
  });
});

describe("smartReturn - file save mode", () => {
  it("saves large content to file and returns reference", () => {
    const bigContent = "word ".repeat(20_000);
    const result = smartReturn(bigContent, workDir, { title: "Big" }) as {
      filePath: string;
      totalLines: number;
      totalTokens: number;
      preview: string;
      hint: string;
      title: string;
    };

    ok(result.filePath.startsWith(".ghostpaw/web/"));
    ok(result.filePath.endsWith(".txt"));
    ok(result.totalLines >= 1);
    ok(result.totalTokens > 3000);
    ok(result.preview.length > 0);
    ok(result.hint.includes("read"));
    strictEqual(result.title, "Big");
    ok(!("content" in result));

    const savedContent = readFileSync(join(workDir, result.filePath), "utf-8");
    strictEqual(savedContent, bigContent);
  });

  it("generates deterministic filenames via hash", () => {
    const content = "x ".repeat(20_000);
    const r1 = smartReturn(content, workDir, {}) as { filePath: string };
    const r2 = smartReturn(content, workDir, {}) as { filePath: string };
    strictEqual(r1.filePath, r2.filePath);
  });

  it("uses custom extension for html", () => {
    const html = "<html>".repeat(20_000);
    const result = smartReturn(html, workDir, {}, ".html") as { filePath: string };
    ok(result.filePath.endsWith(".html"));
  });

  it("generates a preview of the first 20 lines", () => {
    const lines = Array.from({ length: 50 }, (_, i) => `${"word ".repeat(500)}Line ${i + 1}`);
    const result = smartReturn(lines.join("\n"), workDir, {}) as { preview: string };
    ok(result.preview.includes("Line 1"));
    ok(result.preview.includes("Line 20"));
    ok(!result.preview.includes("Line 21"));
    ok(result.preview.includes("(truncated)"));
  });

  it("does not append truncation marker for content <= 20 lines", () => {
    const lines = Array.from({ length: 5 }, (_, i) => `${"word ".repeat(4000)} line ${i}`);
    const result = smartReturn(lines.join("\n"), workDir, {}) as { preview: string };
    ok(!result.preview.includes("(truncated)"));
  });
});

// ── Mock magpie for tool tests ───────────────────────────────────────────────

function mockMagpie(): MagpieApi {
  return {
    async gatherArticle(url: string) {
      return {
        url,
        title: "Test Article",
        description: "A test article",
        content: "This is the article content.",
        text: "Fallback text",
        wordCount: 5,
        readingTime: 1,
        externalLinks: ["https://example.com/a", "https://example.com/b"],
      };
    },
    async gatherWebsite(url: string) {
      return {
        url,
        title: "Test Site",
        description: "A test site",
        text: "Full page plaintext including nav and widgets.",
        image: "https://example.com/img.png",
        language: "en",
        feeds: ["https://example.com/rss"],
        internalLinks: ["/about", "/contact"],
        externalLinks: ["https://other.com"],
      };
    },
    async pluck(url: string) {
      return {
        finalUrl: url,
        async textUtf8() {
          return "<html><body><h1>Hello</h1></body></html>";
        },
      };
    },
  };
}

async function exec(tool: ReturnType<typeof createWebFetchTool>, args: Record<string, unknown>) {
  return tool.execute({ args } as Parameters<ReturnType<typeof createWebFetchTool>["execute"]>[0]);
}

// ── Tool metadata ────────────────────────────────────────────────────────────

describe("Web fetch tool - metadata", () => {
  it("has correct tool name and description", () => {
    const tool = createWebFetchTool(workDir, mockMagpie());
    strictEqual(tool.name, "web_fetch");
    ok(tool.description.includes("article"));
    ok(tool.description.includes("metadata"));
  });
});

// ── Mode: article ────────────────────────────────────────────────────────────

describe("Web fetch tool - article mode", () => {
  it("returns article content inline when small", async () => {
    const tool = createWebFetchTool(workDir, mockMagpie());
    const result = (await exec(tool, { url: "https://example.com", mode: "article" })) as {
      content: string;
      title: string;
      url: string;
    };
    ok(result.content.includes("article content"));
    strictEqual(result.title, "Test Article");
    strictEqual(result.url, "https://example.com");
  });

  it("defaults to article mode when mode is omitted", async () => {
    const tool = createWebFetchTool(workDir, mockMagpie());
    const result = (await exec(tool, { url: "https://example.com" })) as {
      title: string;
    };
    strictEqual(result.title, "Test Article");
  });

  it("includes word count and reading time", async () => {
    const tool = createWebFetchTool(workDir, mockMagpie());
    const result = (await exec(tool, {
      url: "https://example.com",
      mode: "article",
    })) as unknown as {
      wordCount: number;
      readingTime: number;
    };
    strictEqual(result.wordCount, 5);
    strictEqual(result.readingTime, 1);
  });

  it("limits external links to 10", async () => {
    const magpie = mockMagpie();
    const original = magpie.gatherArticle;
    magpie.gatherArticle = async (url) => {
      const article = await original(url);
      article.externalLinks = Array.from({ length: 25 }, (_, i) => `https://link${i}.com`);
      return article;
    };

    const tool = createWebFetchTool(workDir, magpie);
    const result = (await exec(tool, {
      url: "https://example.com",
      mode: "article",
    })) as unknown as {
      links: string[];
    };
    strictEqual(result.links.length, 10);
  });
});

// ── Mode: text ───────────────────────────────────────────────────────────────

describe("Web fetch tool - text mode", () => {
  it("returns full plaintext with title", async () => {
    const tool = createWebFetchTool(workDir, mockMagpie());
    const result = (await exec(tool, { url: "https://example.com", mode: "text" })) as {
      content: string;
      title: string;
    };
    ok(result.content.includes("Full page plaintext"));
    strictEqual(result.title, "Test Site");
  });
});

// ── Mode: metadata ───────────────────────────────────────────────────────────

describe("Web fetch tool - metadata mode", () => {
  it("returns structured metadata without body content", async () => {
    const tool = createWebFetchTool(workDir, mockMagpie());
    const result = (await exec(tool, { url: "https://example.com", mode: "metadata" })) as {
      title: string;
      description: string;
      language: string;
      feeds: string[];
      internalLinks: string[];
      externalLinks: string[];
    };
    strictEqual(result.title, "Test Site");
    strictEqual(result.description, "A test site");
    strictEqual(result.language, "en");
    ok(result.feeds.length > 0);
    ok(result.internalLinks.length > 0);
    ok(result.externalLinks.length > 0);
    ok(!("content" in result));
  });

  it("limits links to 20 each", async () => {
    const magpie = mockMagpie();
    const original = magpie.gatherWebsite;
    magpie.gatherWebsite = async (url) => {
      const site = await original(url);
      site.internalLinks = Array.from({ length: 30 }, (_, i) => `/page${i}`);
      site.externalLinks = Array.from({ length: 30 }, (_, i) => `https://ext${i}.com`);
      return site;
    };

    const tool = createWebFetchTool(workDir, magpie);
    const result = (await exec(tool, { url: "https://example.com", mode: "metadata" })) as {
      internalLinks: string[];
      externalLinks: string[];
    };
    strictEqual(result.internalLinks.length, 20);
    strictEqual(result.externalLinks.length, 20);
  });
});

// ── Mode: html ───────────────────────────────────────────────────────────────

describe("Web fetch tool - html mode", () => {
  it("returns raw html content", async () => {
    const tool = createWebFetchTool(workDir, mockMagpie());
    const result = (await exec(tool, { url: "https://example.com", mode: "html" })) as {
      content: string;
      url: string;
    };
    ok(result.content.includes("<html>"));
    ok(result.content.includes("<h1>Hello</h1>"));
    strictEqual(result.url, "https://example.com");
  });
});

// ── Error handling ───────────────────────────────────────────────────────────

describe("Web fetch tool - error handling", () => {
  it("returns error when fetch fails", async () => {
    const failingMagpie: MagpieApi = {
      async gatherArticle() {
        throw new Error("Network timeout");
      },
      async gatherWebsite() {
        throw new Error("Network timeout");
      },
      async pluck() {
        throw new Error("Network timeout");
      },
    };

    const tool = createWebFetchTool(workDir, failingMagpie);
    const result = (await exec(tool, { url: "https://down.example.com", mode: "article" })) as {
      error: string;
    };
    ok(result.error.includes("Network timeout"));
    ok(result.error.includes("down.example.com"));
  });

  it("handles errors in all modes", async () => {
    const failingMagpie: MagpieApi = {
      async gatherArticle() {
        throw new Error("fail");
      },
      async gatherWebsite() {
        throw new Error("fail");
      },
      async pluck() {
        throw new Error("fail");
      },
    };

    const tool = createWebFetchTool(workDir, failingMagpie);

    for (const mode of ["article", "text", "metadata", "html"] as const) {
      const result = (await exec(tool, { url: "https://x.com", mode })) as { error: string };
      ok(result.error, `Expected error for mode ${mode}`);
    }
  });

  it("handles non-Error throws", async () => {
    const weirdMagpie: MagpieApi = {
      async gatherArticle() {
        throw "string error";
      },
      async gatherWebsite() {
        throw 42;
      },
      async pluck() {
        throw null;
      },
    };

    const tool = createWebFetchTool(workDir, weirdMagpie);
    const result = (await exec(tool, { url: "https://x.com", mode: "article" })) as {
      error: string;
    };
    ok(result.error.includes("string error"));
  });
});
