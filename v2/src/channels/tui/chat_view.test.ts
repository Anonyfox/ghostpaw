import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { renderChatMessages, renderStreamChunk } from "./chat_view.ts";
import { stripAnsi } from "./wrap_text.ts";

describe("renderChatMessages", () => {
  it("renders a user message with bold 'you:' label", () => {
    const lines = renderChatMessages([{ role: "user", content: "hello" }], 80);
    const joined = lines.map(stripAnsi).join("\n");
    ok(joined.includes("you:"));
    ok(joined.includes("hello"));
  });

  it("renders an assistant message with 'ghostpaw:' label", () => {
    const lines = renderChatMessages([{ role: "assistant", content: "hi" }], 80);
    const joined = lines.map(stripAnsi).join("\n");
    ok(joined.includes("ghostpaw:"));
    ok(joined.includes("hi"));
  });

  it("renders multiple messages in order", () => {
    const messages = [
      { role: "user" as const, content: "question" },
      { role: "assistant" as const, content: "answer" },
    ];
    const lines = renderChatMessages(messages, 80);
    const joined = lines.map(stripAnsi).join("\n");
    const qIdx = joined.indexOf("question");
    const aIdx = joined.indexOf("answer");
    ok(qIdx < aIdx);
  });

  it("wraps long content to the specified width", () => {
    const longMsg = "word ".repeat(30).trim();
    const lines = renderChatMessages([{ role: "user", content: longMsg }], 40);
    ok(lines.length > 3);
  });

  it("handles empty messages array", () => {
    const lines = renderChatMessages([], 80);
    strictEqual(lines.length, 0);
  });

  it("renders markdown in assistant messages", () => {
    const lines = renderChatMessages(
      [{ role: "assistant", content: "use **bold** and `code`" }],
      80,
    );
    const plain = lines.map(stripAnsi).join(" ");
    ok(plain.includes("bold"));
    ok(plain.includes("code"));
  });
});

describe("renderStreamChunk", () => {
  it("returns indented lines for a simple chunk", () => {
    const lines = renderStreamChunk("hello", 80);
    ok(lines.length >= 1);
    ok(lines[0]!.includes("hello"));
  });

  it("splits chunks containing newlines", () => {
    const lines = renderStreamChunk("a\nb", 80);
    ok(lines.length >= 2);
  });
});
