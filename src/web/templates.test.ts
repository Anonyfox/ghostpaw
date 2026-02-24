import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appShell, customCSS, loginPage } from "./templates.js";

describe("templates", () => {
  describe("customCSS", () => {
    it("contains color variables", () => {
      assert.ok(customCSS.includes("--gp-bg:"));
      assert.ok(customCSS.includes("--gp-accent:"));
      assert.ok(customCSS.includes("--gp-gradient:"));
    });

    it("contains layout classes", () => {
      assert.ok(customCSS.includes(".gp-layout"));
      assert.ok(customCSS.includes(".gp-sidebar"));
      assert.ok(customCSS.includes(".gp-main"));
    });

    it("contains mobile breakpoint", () => {
      assert.ok(customCSS.includes("@media (max-width: 768px)"));
    });

    it("uses flex-based view classes", () => {
      assert.ok(customCSS.includes(".gp-view"));
      assert.ok(customCSS.includes(".gp-view-flex"));
    });
  });

  describe("loginPage", () => {
    it("returns valid HTML with nonce", () => {
      const html = loginPage("test-nonce-123");
      assert.ok(html.includes('nonce="test-nonce-123"'));
      assert.ok(html.includes("Ghostpaw"));
      assert.ok(html.includes("loginForm"));
      assert.ok(html.includes("<!DOCTYPE html>"));
    });

    it("includes favicon", () => {
      const html = loginPage("n");
      assert.ok(html.includes("data:image/svg+xml"));
    });
  });

  describe("appShell", () => {
    it("returns valid HTML with nonce", () => {
      const html = appShell("test-nonce-456");
      assert.ok(html.includes('nonce="test-nonce-456"'));
      assert.ok(html.includes("gp-layout"));
    });

    it("includes mobile topbar", () => {
      const html = appShell("n");
      assert.ok(html.includes("gp-topbar"));
      assert.ok(html.includes("btnMenu"));
    });

    it("includes sidebar navigation", () => {
      const html = appShell("n");
      assert.ok(html.includes('data-view="chat"'));
      assert.ok(html.includes('data-view="dashboard"'));
      assert.ok(html.includes('data-view="sessions"'));
      assert.ok(html.includes('data-view="skills"'));
      assert.ok(html.includes('data-view="memory"'));
    });

    it("uses gp-view-flex for chat and gp-view for other views", () => {
      const html = appShell("n");
      assert.ok(html.includes('class="gp-view-flex"'));
      assert.ok(html.includes('class="gp-view p-4 d-none"'));
    });

    it("includes session list with min-height:0 for proper flex overflow", () => {
      const html = appShell("n");
      assert.ok(html.includes("min-height:0"));
    });
  });
});
