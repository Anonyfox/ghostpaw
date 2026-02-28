import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { renderBottomBar, renderTopBar } from "./status_bar.ts";
import { stripAnsi } from "./wrap_text.ts";

describe("renderTopBar", () => {
  it("contains the version and model name", () => {
    const bar = renderTopBar({ version: "1.0.0", model: "gpt-4o", width: 60 });
    const plain = stripAnsi(bar);
    ok(plain.includes("ghostpaw"));
    ok(plain.includes("v1.0.0"));
    ok(plain.includes("gpt-4o"));
  });

  it("fills the full width with spacing", () => {
    const bar = renderTopBar({ version: "1.0.0", model: "gpt-4o", width: 60 });
    strictEqual(stripAnsi(bar).length, 60);
  });

  it("handles narrow widths without crashing", () => {
    const bar = renderTopBar({ version: "0.0.1", model: "m", width: 10 });
    ok(stripAnsi(bar).length >= 10);
  });
});

describe("renderBottomBar", () => {
  it("shows token count when tokens are present", () => {
    const bar = renderBottomBar({ tokens: 1500, width: 60 });
    const plain = stripAnsi(bar);
    ok(plain.includes("~1.5k tokens"));
    ok(plain.includes("ctrl+c exit"));
  });

  it("omits token count when zero", () => {
    const bar = renderBottomBar({ tokens: 0, width: 60 });
    const plain = stripAnsi(bar);
    ok(!plain.includes("tokens"));
    ok(plain.includes("ctrl+c exit"));
  });

  it("fills the full width with spacing", () => {
    const bar = renderBottomBar({ tokens: 500, width: 60 });
    strictEqual(stripAnsi(bar).length, 60);
  });

  it("shows scroll indicator when scrolled", () => {
    const bar = renderBottomBar({ tokens: 0, width: 60, scrolled: true });
    const plain = stripAnsi(bar);
    ok(plain.includes("[scrolled]"));
  });

  it("omits scroll indicator when not scrolled", () => {
    const bar = renderBottomBar({ tokens: 0, width: 60, scrolled: false });
    const plain = stripAnsi(bar);
    ok(!plain.includes("[scrolled]"));
  });
});
