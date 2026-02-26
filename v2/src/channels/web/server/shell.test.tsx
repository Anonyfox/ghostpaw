import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { renderShell } from "./shell.tsx";

describe("renderShell", () => {
  const nonce = "dGVzdG5vbmNlMTIzNDU2Nzg=";
  const bootId = "abc123";

  it("returns a complete HTML document with all required elements", () => {
    const html = renderShell(nonce, bootId);
    ok(html.startsWith("<!DOCTYPE html>"));
    ok(html.includes('<html lang="en"'));
    ok(html.includes('<meta charset="utf-8"'));
    ok(html.includes("width=device-width, initial-scale=1"));
    ok(html.includes("<title>Ghostpaw</title>"));
    ok(html.includes('<div id="app"></div>'));
    ok(html.includes("<head>"));
    ok(html.includes("</head>"));
    ok(html.includes("<body>"));
    ok(html.includes("</body>"));
    ok(html.includes("</html>"));
  });

  it("injects nonce into both stylesheet and script tags", () => {
    const html = renderShell(nonce, bootId);
    ok(html.includes(`nonce="${nonce}"`));
    const nonceMatches = html.match(new RegExp(`nonce="${nonce}"`, "g"));
    strictEqual(nonceMatches?.length, 2);
  });

  it("cache-busts assets with bootId query param", () => {
    const html = renderShell(nonce, bootId);
    ok(html.includes(`/assets/style.css?v=${bootId}`));
    ok(html.includes(`/assets/app.js?v=${bootId}`));
  });

  it("uses type=module on the script tag", () => {
    const html = renderShell(nonce, bootId);
    ok(html.includes('type="module"'));
    ok(html.includes(`src="/assets/app.js?v=${bootId}"`));
  });

  it("includes a data-URI SVG favicon", () => {
    const html = renderShell(nonce, bootId);
    ok(html.includes('rel="icon"'));
    ok(html.includes("data:image/svg+xml,"));
  });

  it("produces different output for different nonce values", () => {
    const html1 = renderShell("nonceAAAA", bootId);
    const html2 = renderShell("nonceBBBB", bootId);
    ok(html1.includes('nonce="nonceAAAA"'));
    ok(html2.includes('nonce="nonceBBBB"'));
    ok(!html1.includes('nonce="nonceBBBB"'));
    ok(!html2.includes('nonce="nonceAAAA"'));
  });

  it("produces different output for different bootId values", () => {
    const html1 = renderShell(nonce, "build-001");
    const html2 = renderShell(nonce, "build-002");
    ok(html1.includes("?v=build-001"));
    ok(html2.includes("?v=build-002"));
    ok(!html1.includes("?v=build-002"));
    ok(!html2.includes("?v=build-001"));
  });

  it("returns a string, not a buffer or object", () => {
    const html = renderShell(nonce, bootId);
    strictEqual(typeof html, "string");
  });

  it("places script tag inside body, after the app div", () => {
    const html = renderShell(nonce, bootId);
    const appDivIndex = html.indexOf('<div id="app">');
    const scriptIndex = html.indexOf("<script ");
    const bodyCloseIndex = html.indexOf("</body>");
    ok(appDivIndex < scriptIndex);
    ok(scriptIndex < bodyCloseIndex);
  });

  it("places stylesheet link inside head", () => {
    const html = renderShell(nonce, bootId);
    const headOpenIndex = html.indexOf("<head>");
    const headCloseIndex = html.indexOf("</head>");
    const stylesheetIndex = html.indexOf('rel="stylesheet"');
    ok(stylesheetIndex > headOpenIndex);
    ok(stylesheetIndex < headCloseIndex);
  });
});
