import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { extractSummary } from "./extract_summary.ts";

describe("extractSummary", () => {
  it("extracts text after ## Summary marker", () => {
    const response = [
      "I explored the deployment pipeline and found a potential issue.",
      "",
      "## Summary",
      "Reviewed deployment pipeline. Found a race condition in the rollback logic.",
    ].join("\n");

    strictEqual(
      extractSummary(response),
      "Reviewed deployment pipeline. Found a race condition in the rollback logic.",
    );
  });

  it("uses the last ## Summary marker if multiple exist", () => {
    const response = [
      "## Summary",
      "First draft summary.",
      "",
      "Actually, let me reconsider.",
      "",
      "## Summary",
      "Better summary after reconsideration.",
    ].join("\n");

    strictEqual(extractSummary(response), "Better summary after reconsideration.");
  });

  it("falls back to full text when short and no marker", () => {
    const response = "Brief thought about the workspace.";
    strictEqual(extractSummary(response), "Brief thought about the workspace.");
  });

  it("truncates long responses without a marker", () => {
    const response = "x".repeat(1000);
    const summary = extractSummary(response);
    strictEqual(summary.length, 503);
    strictEqual(summary.endsWith("..."), true);
  });

  it("handles empty response", () => {
    strictEqual(extractSummary(""), "");
  });

  it("handles marker with no content after it", () => {
    const response = "Some thinking.\n\n## Summary\n";
    const summary = extractSummary(response);
    strictEqual(summary.length > 0, true);
  });

  it("trims whitespace from extracted summary", () => {
    const response = "Thoughts.\n\n## Summary\n\n  Clean summary here.  \n";
    strictEqual(extractSummary(response), "Clean summary here.");
  });
});
