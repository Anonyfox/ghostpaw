import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { ansi } from "./ansi.ts";

describe("ansi", () => {
  it("enterAltScreen is the standard DEC private mode sequence", () => {
    strictEqual(ansi.enterAltScreen, "\x1b[?1049h");
  });

  it("exitAltScreen restores the main screen buffer", () => {
    strictEqual(ansi.exitAltScreen, "\x1b[?1049l");
  });

  it("cursorTo positions at the given 1-based row and column", () => {
    strictEqual(ansi.cursorTo(5, 10), "\x1b[5;10H");
    strictEqual(ansi.cursorTo(1, 1), "\x1b[1;1H");
  });

  it("setScrollRegion sets DECSTBM with top and bottom rows", () => {
    strictEqual(ansi.setScrollRegion(2, 20), "\x1b[2;20r");
  });

  it("resetScrollRegion clears the scroll region constraint", () => {
    strictEqual(ansi.resetScrollRegion, "\x1b[r");
  });

  it("clearLine erases the entire current line", () => {
    strictEqual(ansi.clearLine, "\x1b[2K");
  });

  it("hideCursor and showCursor are inverse operations", () => {
    ok(ansi.hideCursor.includes("?25l"));
    ok(ansi.showCursor.includes("?25h"));
  });
});
