import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import type { SessionMessageInfo } from "../../shared/session_types.ts";
import { SessionTranscript } from "./session_transcript.tsx";

describe("SessionTranscript", () => {
  it("exports a function component", () => {
    ok(typeof SessionTranscript === "function");
  });

  it("renders empty messages", () => {
    const el = SessionTranscript({ messages: [], sessionModel: null });
    ok(el);
  });

  it("renders user and assistant messages", () => {
    const messages: SessionMessageInfo[] = [
      {
        id: 1,
        role: "user",
        content: "Hello",
        model: null,
        createdAt: Date.now(),
        isCompaction: false,
        toolData: null,
        costUsd: 0,
        tokensOut: 0,
      },
      {
        id: 2,
        role: "assistant",
        content: "Hi there!",
        model: "claude-sonnet-4-6",
        createdAt: Date.now(),
        isCompaction: false,
        toolData: null,
        costUsd: 0.01,
        tokensOut: 200,
      },
    ];
    const el = SessionTranscript({ messages, sessionModel: "claude-sonnet-4-6" });
    ok(el);
  });
});
