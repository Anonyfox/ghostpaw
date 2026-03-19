import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { relativeTime } from "./relative_time.ts";

describe("relativeTime", () => {
  it("returns 'just now' for timestamps less than a minute old", () => {
    strictEqual(relativeTime(Date.now()), "just now");
    strictEqual(relativeTime(Date.now() - 30_000), "just now");
  });

  it("returns minutes for timestamps under an hour", () => {
    strictEqual(relativeTime(Date.now() - 5 * 60_000), "5m ago");
    strictEqual(relativeTime(Date.now() - 59 * 60_000), "59m ago");
  });

  it("returns hours for timestamps under a day", () => {
    strictEqual(relativeTime(Date.now() - 3 * 3_600_000), "3h ago");
  });

  it("returns days for timestamps under 30 days", () => {
    strictEqual(relativeTime(Date.now() - 7 * 86_400_000), "7d ago");
  });

  it("returns months for timestamps over 30 days", () => {
    strictEqual(relativeTime(Date.now() - 60 * 86_400_000), "2mo ago");
  });

  it("returns years for timestamps over 12 months", () => {
    strictEqual(relativeTime(Date.now() - 400 * 86_400_000), "1y ago");
    strictEqual(relativeTime(Date.now() - 800 * 86_400_000), "2y ago");
  });
});
