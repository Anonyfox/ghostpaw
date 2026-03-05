import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  SessionDetailResponse,
  SessionInfo,
  SessionListResponse,
  SessionMessageInfo,
  SessionRunInfo,
  SessionStatsResponse,
} from "./session_types.ts";

describe("session shared types", () => {
  it("SessionInfo is structurally valid", () => {
    const s: SessionInfo = {
      id: 1,
      key: "web:chat:123",
      channel: "web",
      purpose: "chat",
      status: "open",
      displayName: "Test session",
      preview: "Hello there",
      model: "claude-sonnet-4-6",
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      tokensIn: 1000,
      tokensOut: 500,
      reasoningTokens: 0,
      cachedTokens: 200,
      costUsd: 0.04,
      messageCount: 5,
      parentSessionId: null,
      delegationCount: 2,
    };
    ok(s.id > 0);
  });

  it("SessionStatsResponse is structurally valid", () => {
    const stats: SessionStatsResponse = {
      total: 100,
      open: 5,
      closed: 80,
      distilled: 15,
      byChannel: { web: 60, telegram: 30, delegate: 10 },
      byPurpose: { chat: 70, delegate: 20, system: 10 },
    };
    ok(stats.total > 0);
  });

  it("SessionListResponse is structurally valid", () => {
    const list: SessionListResponse = { sessions: [], total: 0 };
    ok(Array.isArray(list.sessions));
  });

  it("SessionMessageInfo is structurally valid", () => {
    const msg: SessionMessageInfo = {
      id: 1,
      role: "assistant",
      content: "Hello",
      model: "claude-sonnet-4-6",
      createdAt: Date.now(),
      isCompaction: false,
      toolData: null,
      costUsd: 0.01,
      tokensOut: 200,
    };
    ok(msg.id > 0);
  });

  it("SessionRunInfo is structurally valid", () => {
    const run: SessionRunInfo = {
      id: 1,
      specialist: "Researcher",
      model: "claude-sonnet-4-6",
      task: "Summarize article",
      status: "completed",
      result: "Summary here",
      error: null,
      costUsd: 0.04,
      tokensIn: 5000,
      tokensOut: 2000,
      createdAt: Date.now(),
      completedAt: Date.now(),
      childSessionId: 5,
    };
    ok(run.status === "completed");
  });

  it("SessionDetailResponse is structurally valid", () => {
    const detail: SessionDetailResponse = {
      session: {
        id: 1,
        key: "web:chat:1",
        channel: "web",
        purpose: "chat",
        status: "open",
        displayName: "Test",
        preview: "",
        model: null,
        createdAt: 0,
        lastActiveAt: 0,
        tokensIn: 0,
        tokensOut: 0,
        reasoningTokens: 0,
        cachedTokens: 0,
        costUsd: 0,
        messageCount: 0,
        parentSessionId: null,
        delegationCount: 0,
      },
      messages: [],
      runs: [],
      parentSession: null,
    };
    ok(detail.session.id > 0);
  });
});
