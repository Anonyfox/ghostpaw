import { describe, it } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert";
import { parseFrontmatter } from "./parse_frontmatter.ts";

describe("parseFrontmatter", () => {
  it("parses standard AgentSkills frontmatter with name and description", () => {
    const content = `---
name: deploy-app
description: Deploy the application to production.
---

# Deploy App

Steps here.`;

    const result = parseFrontmatter(content);
    strictEqual(result.frontmatter?.name, "deploy-app");
    strictEqual(result.frontmatter?.description, "Deploy the application to production.");
    strictEqual(result.body, "# Deploy App\n\nSteps here.");
  });

  it("parses all optional fields", () => {
    const content = `---
name: code-review
description: Review code for bugs.
license: MIT
compatibility: Requires git and docker
allowed-tools: Bash Read Write
disable-model-invocation: true
---

Body here.`;

    const result = parseFrontmatter(content);
    const fm = result.frontmatter!;
    strictEqual(fm.name, "code-review");
    strictEqual(fm.license, "MIT");
    strictEqual(fm.compatibility, "Requires git and docker");
    strictEqual(fm.allowedTools, "Bash Read Write");
    strictEqual(fm.disableModelInvocation, true);
    strictEqual(result.body, "Body here.");
  });

  it("parses metadata as single-line JSON", () => {
    const content = `---
name: test
description: A test skill.
metadata: {"author": "ghostpaw", "version": "1.0"}
---

Body.`;

    const result = parseFrontmatter(content);
    deepStrictEqual(result.frontmatter?.metadata, { author: "ghostpaw", version: "1.0" });
  });

  it("preserves metadata as raw string when not valid JSON", () => {
    const content = `---
name: test
description: A test skill.
metadata: not-json-at-all
---

Body.`;

    const result = parseFrontmatter(content);
    strictEqual(result.frontmatter?.metadata, undefined);
    strictEqual(result.frontmatter?.raw.metadata, "not-json-at-all");
  });

  it("returns null frontmatter when none present", () => {
    const content = "# Deploy App\n\nSome instructions.";
    const result = parseFrontmatter(content);
    strictEqual(result.frontmatter, null);
    strictEqual(result.body, "# Deploy App\n\nSome instructions.");
  });

  it("handles malformed YAML gracefully", () => {
    const content = `---
name "missing colon
description: Works fine
---

Body.`;

    const result = parseFrontmatter(content);
    strictEqual(result.frontmatter?.name, "");
    strictEqual(result.frontmatter?.description, "Works fine");
  });

  it("strips BOM character before parsing", () => {
    const content = `\uFEFF---
name: bom-test
description: Has a BOM.
---

Body.`;

    const result = parseFrontmatter(content);
    strictEqual(result.frontmatter?.name, "bom-test");
  });

  it("returns null frontmatter for empty delimiters with no content", () => {
    const content = `---
---

Body.`;

    const result = parseFrontmatter(content);
    strictEqual(result.frontmatter, null);
    strictEqual(result.body, "Body.");
  });

  it("handles description with special characters", () => {
    const content = `---
name: special
description: "Deploy: staging (v2) & production — with 'care'"
---

Body.`;

    const result = parseFrontmatter(content);
    strictEqual(result.frontmatter?.description, "Deploy: staging (v2) & production — with 'care'");
  });

  it("handles a very long description", () => {
    const longDesc = "A".repeat(1024);
    const content = `---
name: long
description: ${longDesc}
---

Body.`;

    const result = parseFrontmatter(content);
    strictEqual(result.frontmatter?.description, longDesc);
    strictEqual(result.frontmatter?.description.length, 1024);
  });

  it("preserves unknown fields in the raw map", () => {
    const content = `---
name: extra
description: Has extras.
homepage: https://example.com
version: 2.0.1
---

Body.`;

    const result = parseFrontmatter(content);
    strictEqual(result.frontmatter?.raw.homepage, "https://example.com");
    strictEqual(result.frontmatter?.raw.version, "2.0.1");
  });

  it("normalizes Windows CRLF line endings", () => {
    const content = "---\r\nname: crlf\r\ndescription: Windows style.\r\n---\r\n\r\nBody.";
    const result = parseFrontmatter(content);
    strictEqual(result.frontmatter?.name, "crlf");
    strictEqual(result.body, "Body.");
  });

  it("treats only the first --- pair as frontmatter", () => {
    const content = `---
name: multi-dash
description: Has dashes in body.
---

# Title

Some text.

---

This is a horizontal rule, not frontmatter.`;

    const result = parseFrontmatter(content);
    strictEqual(result.frontmatter?.name, "multi-dash");
    strictEqual(result.body.includes("This is a horizontal rule"), true);
  });

  it("handles quoted name and description values", () => {
    const content = `---
name: "quoted-name"
description: 'Single quoted description'
---

Body.`;

    const result = parseFrontmatter(content);
    strictEqual(result.frontmatter?.name, "quoted-name");
    strictEqual(result.frontmatter?.description, "Single quoted description");
  });

  it("returns full content as body when only opening delimiter exists", () => {
    const content = "---\nname: broken\nno closing delimiter";
    const result = parseFrontmatter(content);
    strictEqual(result.frontmatter, null);
  });

  it("handles disable-model-invocation as false", () => {
    const content = `---
name: test
description: test
disable-model-invocation: false
---

Body.`;

    const result = parseFrontmatter(content);
    strictEqual(result.frontmatter?.disableModelInvocation, false);
  });
});
