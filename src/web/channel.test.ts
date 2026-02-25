import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { after, before, describe, it } from "node:test";
import type { ChannelRuntime } from "../channels/runtime.js";
import { createSessionToken, hashPassword } from "./auth.js";
import type { WebStartResult } from "./types.js";

const TEST_PASSWORD = "test-password-42";
const TEST_HASH = hashPassword(TEST_PASSWORD);

const mockSessions: {
  id: string;
  key: string;
  createdAt: number;
  lastActive: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  model: string | null;
  headMessageId: string | null;
  tokenBudget: number | null;
  metadata: string | null;
  absorbedAt: number | null;
  purpose: string;
}[] = [];
const mockMessages: {
  id: string;
  role: string;
  content: string;
  createdAt: number;
  isCompaction: boolean;
  sessionId: string;
  parentId: string | null;
  model: string | null;
  tokensIn: number;
  tokensOut: number;
}[] = [];
const mockMemories: { id: string; content: string; createdAt: number; sessionId: string | null }[] =
  [];

function createMockRuntime(): ChannelRuntime {
  return {
    workspace: "/tmp/web-test",
    model: "test-model",
    eventBus: { on() {}, off() {}, emit() {} } as never,
    sessions: {
      listSessions: () => mockSessions,
      getSessionByKey: (key: string) => mockSessions.find((s) => s.key === key) ?? null,
      createSession: (key: string, _opts?: unknown) => {
        const s = {
          id: `sid-${Date.now()}`,
          key,
          createdAt: Date.now(),
          lastActive: Date.now(),
          tokensIn: 0,
          tokensOut: 0,
          costUsd: 0,
          model: "test-model",
          headMessageId: null,
          tokenBudget: null,
          metadata: null,
          absorbedAt: null,
          purpose: "chat" as const,
        };
        mockSessions.push(s);
        return s;
      },
      getConversationHistory: (_id: string) => mockMessages,
      countUnabsorbed: () => 0,
    } as never,
    memory: {
      count: () => mockMemories.length,
      list: () => mockMemories,
      search: () => [],
      delete: (id: string) => {
        const idx = mockMemories.findIndex((m) => m.id === id);
        if (idx >= 0) mockMemories.splice(idx, 1);
      },
    } as never,
    secrets: {
      get: (key: string) => (key === "WEB_UI_PASSWORD" ? TEST_HASH : null),
      set: () => ({ key: "", value: "", warnings: [] }),
      keys: () => ["WEB_UI_PASSWORD", "API_KEY_ANTHROPIC"],
    } as never,

    setModel(_m: string): void {},
    async run(_sessionKey: string, _text: string): Promise<string> {
      return "mock response";
    },
    async *stream(_sessionKey: string, _text: string): AsyncGenerator<string> {
      yield "hello ";
      yield "world";
    },
    stop(): void {},
  };
}

let baseURL = "";
let channel: { start: () => Promise<unknown>; stop: () => Promise<void>; name: string };

async function req(path: string, opts: RequestInit & { cookie?: string } = {}): Promise<Response> {
  const headers = new Headers(opts.headers);
  if (opts.cookie) headers.set("Cookie", opts.cookie);
  headers.set("Connection", "close");
  return fetch(`${baseURL}${path}`, { ...opts, headers, redirect: "manual" });
}

async function authCookie(): Promise<string> {
  const token = createSessionToken(TEST_HASH);
  return `ghostpaw_session=${token}`;
}

describe("web channel (integration)", () => {
  before(async () => {
    const { createWebChannel } = await import("./channel.js");
    const runtime = createMockRuntime();
    const testPort = 18942 + Math.floor(Math.random() * 1000);
    channel = createWebChannel(runtime, { port: testPort });
    const result = (await channel.start()) as WebStartResult;
    baseURL = result.url;
  });

  after(async () => {
    await channel.stop();
  });

  describe("GET /health", () => {
    it("returns ok without auth", async () => {
      const res = await req("/health");
      strictEqual(res.status, 200);
      const data = await res.json();
      deepStrictEqual(data, { ok: true });
    });
  });

  describe("security headers", () => {
    it("sets X-Content-Type-Options", async () => {
      const res = await req("/health");
      strictEqual(res.headers.get("x-content-type-options"), "nosniff");
    });

    it("sets X-Frame-Options", async () => {
      const res = await req("/health");
      strictEqual(res.headers.get("x-frame-options"), "DENY");
    });

    it("sets Referrer-Policy", async () => {
      const res = await req("/health");
      strictEqual(res.headers.get("referrer-policy"), "no-referrer");
    });

    it("sets Cache-Control: no-store", async () => {
      const res = await req("/health");
      strictEqual(res.headers.get("cache-control"), "no-store");
    });
  });

  describe("authentication", () => {
    it("redirects / to /login when unauthenticated", async () => {
      const res = await req("/");
      strictEqual(res.status, 302);
      strictEqual(res.headers.get("location"), "/login");
    });

    it("returns 401 for API routes when unauthenticated", async () => {
      const res = await req("/api/status");
      strictEqual(res.status, 401);
    });

    it("serves login page without auth", async () => {
      const res = await req("/login");
      strictEqual(res.status, 200);
      const html = await res.text();
      ok(html.includes("Ghostpaw"));
      ok(html.includes("loginForm"));
    });

    it("login with correct password returns token", async () => {
      const res = await req("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: TEST_PASSWORD }),
      });
      strictEqual(res.status, 200);
      const data = (await res.json()) as { ok: boolean; token: string };
      ok(data.ok);
      ok(typeof data.token === "string" && data.token.length > 0);
    });

    it("login with wrong password returns 401", async () => {
      const res = await req("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "wrong" }),
      });
      strictEqual(res.status, 401);
    });

    it("authenticated requests with cookie succeed", async () => {
      const cookie = await authCookie();
      const res = await req("/api/status", { cookie });
      strictEqual(res.status, 200);
    });

    it("authenticated requests with bearer token succeed", async () => {
      const token = createSessionToken(TEST_HASH);
      const res = await req("/api/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      strictEqual(res.status, 200);
    });
  });

  describe("Content-Security-Policy", () => {
    it("includes CSP header with nonce on HTML responses", async () => {
      const res = await req("/login");
      const csp = res.headers.get("content-security-policy");
      ok(csp, "CSP header should be present");
      ok(csp.includes("script-src 'nonce-"), "CSP should contain script nonce");
      ok(csp.includes("frame-ancestors 'none'"), "CSP should prevent framing");
      ok(csp.includes("default-src 'none'"), "CSP should deny by default");
    });
  });

  describe("CSRF protection", () => {
    it("rejects POST with wrong origin", async () => {
      const cookie = await authCookie();
      const res = await req("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://evil.com",
        },
        cookie,
        body: JSON.stringify({ name: "test" }),
      });
      strictEqual(res.status, 403);
    });

    it("allows POST without origin header (non-browser)", async () => {
      const cookie = await authCookie();
      const res = await req("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cookie,
        body: JSON.stringify({ name: "csrf-test" }),
      });
      strictEqual(res.status, 201);
    });
  });

  describe("GET /api/status", () => {
    it("returns dashboard stats", async () => {
      const cookie = await authCookie();
      const res = await req("/api/status", { cookie });
      strictEqual(res.status, 200);
      const data = (await res.json()) as Record<string, unknown>;
      ok("model" in data);
      ok("sessions" in data);
      ok("skills" in data);
      ok("memories" in data);
      ok("tokens" in data);
    });
  });

  describe("sessions API", () => {
    it("lists sessions", async () => {
      const cookie = await authCookie();
      const res = await req("/api/sessions", { cookie });
      strictEqual(res.status, 200);
      const data = await res.json();
      ok(Array.isArray(data));
    });

    it("creates a session", async () => {
      const cookie = await authCookie();
      const res = await req("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cookie,
        body: JSON.stringify({ name: "test-session" }),
      });
      strictEqual(res.status, 201);
      const data = (await res.json()) as { id: string; key: string };
      ok(data.key.startsWith("web:"));
    });
  });

  describe("GET /api/secrets", () => {
    it("returns key names but never values", async () => {
      const cookie = await authCookie();
      const res = await req("/api/secrets", { cookie });
      strictEqual(res.status, 200);
      const data = (await res.json()) as { key: string; configured: boolean }[];
      ok(data.length > 0);
      for (const item of data) {
        ok("key" in item);
        ok("configured" in item);
        ok(!("value" in item), "Secret values must never be returned");
      }
    });
  });

  describe("GET /api/train/status", () => {
    it("returns training status with expected shape", async () => {
      const cookie = await authCookie();
      const res = await req("/api/train/status", { cookie });
      strictEqual(res.status, 200);
      const data = (await res.json()) as {
        unabsorbed: number;
        totalSkills: number;
        running: boolean;
      };
      ok(typeof data.unabsorbed === "number", "unabsorbed should be a number");
      ok(typeof data.totalSkills === "number", "totalSkills should be a number");
      strictEqual(data.running, false, "running should be false when idle");
    });
  });

  describe("POST /api/train (unauthorized)", () => {
    it("returns 401 without auth", async () => {
      const res = await req("/api/train", { method: "POST" });
      strictEqual(res.status, 401);
    });
  });

  describe("GET /api/scout/status", () => {
    it("returns scout status with expected shape", async () => {
      const cookie = await authCookie();
      const res = await req("/api/scout/status", { cookie });
      strictEqual(res.status, 200);
      const data = (await res.json()) as {
        memoryCount: number;
        skillCount: number;
        running: boolean;
      };
      ok(typeof data.memoryCount === "number", "memoryCount should be a number");
      ok(typeof data.skillCount === "number", "skillCount should be a number");
      strictEqual(data.running, false, "running should be false when idle");
    });
  });

  describe("POST /api/scout (unauthorized)", () => {
    it("returns 401 without auth", async () => {
      const res = await req("/api/scout", { method: "POST" });
      strictEqual(res.status, 401);
    });
  });

  describe("unknown routes", () => {
    it("returns 404 for unknown paths", async () => {
      const res = await req("/nonexistent");
      strictEqual(res.status, 404);
    });
  });

  describe("static assets", () => {
    it("serves CSS without auth", async () => {
      const res = await req("/assets/style.css");
      strictEqual(res.status, 200);
      ok(res.headers.get("content-type")?.includes("text/css"));
      const body = await res.text();
      ok(body.length > 0, "CSS should contain at least custom styles");
    });

    it("serves app.js without auth", async () => {
      const res = await req("/assets/app.js");
      strictEqual(res.status, 200);
      ok(res.headers.get("content-type")?.includes("javascript"));
    });

    it("serves marked.js without auth", async () => {
      const res = await req("/assets/marked.js");
      strictEqual(res.status, 200);
      ok(res.headers.get("content-type")?.includes("javascript"));
    });
  });

  describe("session name limits", () => {
    it("truncates long session names to 64 characters", async () => {
      const cookie = await authCookie();
      const longName = "x".repeat(200);
      const res = await req("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cookie,
        body: JSON.stringify({ name: longName }),
      });
      strictEqual(res.status, 201);
      const data = (await res.json()) as { key: string };
      ok(data.key.length <= 64 + "web:".length, "Session key should be truncated");
    });
  });

  describe("HSTS header", () => {
    it("does not send HSTS on localhost", async () => {
      const res = await req("/health");
      strictEqual(res.headers.get("strict-transport-security"), null);
    });
  });

  describe("POST /api/sessions/:key/chat", () => {
    it("streams SSE response", async () => {
      const cookie = await authCookie();

      await req("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cookie,
        body: JSON.stringify({ name: "stream-test" }),
      });

      const res = await req("/api/sessions/web%3Astream-test/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cookie,
        body: JSON.stringify({ message: "hello" }),
      });

      strictEqual(res.status, 200);
      ok(res.headers.get("content-type")?.includes("text/event-stream"));

      const body = await res.text();
      ok(body.includes("data:"), "Should contain SSE data lines");
      ok(body.includes('"type":"chunk"'), "Should contain chunk events");
      ok(body.includes('"type":"done"'), "Should contain done event");
    });
  });
});
