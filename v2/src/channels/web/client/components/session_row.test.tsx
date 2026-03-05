import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import type { SessionInfo } from "../../shared/session_types.ts";
import { SessionRow } from "./session_row.tsx";

describe("SessionRow", () => {
  const session: SessionInfo = {
    id: 1,
    key: "web:chat:1",
    channel: "web",
    purpose: "chat",
    status: "open",
    displayName: "Test session",
    preview: "Hello world",
    model: "claude-sonnet-4-6",
    createdAt: Date.now() - 3600000,
    lastActiveAt: Date.now() - 60000,
    tokensIn: 1200,
    tokensOut: 800,
    reasoningTokens: 0,
    cachedTokens: 100,
    costUsd: 0.04,
    messageCount: 5,
    parentSessionId: null,
    delegationCount: 2,
  };

  it("exports a function component", () => {
    ok(typeof SessionRow === "function");
  });

  it("renders with valid session data", () => {
    const el = SessionRow({ session, expanded: false, onClick: () => {} });
    ok(el);
  });

  it("renders in expanded state", () => {
    const el = SessionRow({ session, expanded: true, onClick: () => {} });
    ok(el);
  });
});
