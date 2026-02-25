import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createRouter } from "./router.js";
import { registerAPIRoutes } from "./routes-api.js";

function mockRuntime(workspace = "/tmp") {
  return {
    workspace,
    model: "test",
    sessions: {
      listSessions: () => [],
      getSessionByKey: () => null,
      createSession: (key: string) => ({
        id: "sid-1",
        key,
        createdAt: Date.now(),
        lastActive: Date.now(),
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
        model: "test",
        headMessageId: null,
        tokenBudget: null,
        metadata: null,
        absorbedAt: null,
        purpose: "chat" as const,
      }),
      getConversationHistory: () => [],
      countUnabsorbed: () => 0,
    },
    memory: {
      count: () => 0,
      list: () => [],
      search: () => [],
      delete: () => {},
    },
    secrets: {
      get: () => null,
      set: () => ({ key: "", value: "", warnings: [] }),
      keys: () => ["KEY_A"],
    },
    eventBus: { on() {}, off() {}, emit() {} },
    setModel() {},
    run: async () => "",
    stream: async function* () {},
    stop() {},
  };
}

function fakeReq(
  method: string,
  url: string,
  body = "",
  headers: Record<string, string> = {},
): IncomingMessage {
  const stream = new Readable({ read() {} }) as IncomingMessage;
  stream.method = method;
  stream.url = url;
  stream.headers = { "content-type": "application/json", ...headers };
  if (body) stream.push(body);
  stream.push(null);
  return stream;
}

function fakeRes(): ServerResponse & {
  _status: number;
  _body: string;
  _headers: Record<string, string>;
} {
  const res = {
    _status: 0,
    _body: "",
    _headers: {} as Record<string, string>,
    writeHead(status: number, headers: Record<string, string> = {}) {
      res._status = status;
      Object.assign(res._headers, headers);
      return res;
    },
    end(data?: string) {
      if (data) res._body = data;
    },
    write() {
      return true;
    },
  };
  return res as never;
}

describe("routes-api", () => {
  it("registers all expected API routes", () => {
    const router = createRouter();
    registerAPIRoutes(router, mockRuntime() as never);

    const routes = [
      ["GET", "/api/status"],
      ["GET", "/api/sessions"],
      ["POST", "/api/sessions"],
      ["GET", "/api/sessions/web%3Atest/messages"],
      ["POST", "/api/sessions/web%3Atest/chat"],
      ["GET", "/api/skills"],
      ["GET", "/api/skills/test.md"],
      ["PUT", "/api/skills/test.md"],
      ["GET", "/api/agents"],
      ["GET", "/api/agents/test.md"],
      ["PUT", "/api/agents/test.md"],
      ["DELETE", "/api/agents/test.md"],
      ["POST", "/api/agents/test.md/refine/discover"],
      ["POST", "/api/agents/test.md/refine/apply"],
      ["GET", "/api/memory"],
      ["DELETE", "/api/memory/mem-1"],
      ["GET", "/api/secrets"],
      ["GET", "/api/settings"],
      ["PUT", "/api/settings/model"],
      ["PUT", "/api/settings/secrets/TEST_KEY"],
      ["DELETE", "/api/settings/secrets/TEST_KEY"],
      ["GET", "/api/train/status"],
      ["POST", "/api/train"],
      ["GET", "/api/scout/status"],
      ["POST", "/api/scout"],
    ] as const;

    for (const [method, path] of routes) {
      const match = router.match(method, path);
      assert.ok(match, `Expected route ${method} ${path} to exist`);
      assert.strictEqual(match.requiresAuth, true);
    }
  });

  describe("agents CRUD", () => {
    let workspace: string;
    let router: ReturnType<typeof createRouter>;

    beforeEach(() => {
      workspace = mkdtempSync(join(tmpdir(), "gp-test-agents-"));
      router = createRouter();
      registerAPIRoutes(router, mockRuntime(workspace) as never);
    });

    afterEach(() => {
      rmSync(workspace, { recursive: true, force: true });
    });

    async function call(method: string, path: string, body?: unknown) {
      const match = router.match(method, path);
      assert.ok(match, `Route ${method} ${path} not found`);
      const req = fakeReq(method, path, body ? JSON.stringify(body) : "");
      const res = fakeRes();
      await match.handler(req, res, {} as never);
      return { status: res._status, body: res._body ? JSON.parse(res._body) : null };
    }

    it("GET /api/agents returns empty list when no agents dir", async () => {
      const { status, body } = await call("GET", "/api/agents");
      assert.strictEqual(status, 200);
      assert.deepStrictEqual(body, []);
    });

    it("GET /api/agents lists .md files with metadata", async () => {
      const agentsDir = join(workspace, "agents");
      mkdirSync(agentsDir);
      writeFileSync(join(agentsDir, "coder.md"), "# Code Specialist\n\nWrites clean TypeScript.\n");
      writeFileSync(join(agentsDir, "writer.md"), "# Technical Writer\n\nDocumentation expert.\n");
      writeFileSync(join(agentsDir, "notes.txt"), "not an agent");

      const { status, body } = await call("GET", "/api/agents");
      assert.strictEqual(status, 200);
      assert.strictEqual(body.length, 2);

      const coder = body.find((a: { filename: string }) => a.filename === "coder.md");
      assert.ok(coder);
      assert.strictEqual(coder.title, "Code Specialist");
      assert.strictEqual(coder.description, "Writes clean TypeScript.");
      assert.strictEqual(coder.lines, 4);

      const writer = body.find((a: { filename: string }) => a.filename === "writer.md");
      assert.ok(writer);
      assert.strictEqual(writer.title, "Technical Writer");
    });

    it("GET /api/agents/:filename reads agent content", async () => {
      const agentsDir = join(workspace, "agents");
      mkdirSync(agentsDir);
      writeFileSync(join(agentsDir, "coder.md"), "# Coder\n\nSystem prompt here.");

      const { status, body } = await call("GET", "/api/agents/coder.md");
      assert.strictEqual(status, 200);
      assert.strictEqual(body.filename, "coder.md");
      assert.strictEqual(body.content, "# Coder\n\nSystem prompt here.");
    });

    it("GET /api/agents/:filename returns 404 for missing agent", async () => {
      const { status, body } = await call("GET", "/api/agents/nope.md");
      assert.strictEqual(status, 404);
      assert.strictEqual(body.error, "Agent not found");
    });

    it("GET /api/agents/:filename rejects non-.md filenames", async () => {
      const { status, body } = await call("GET", "/api/agents/bad.txt");
      assert.strictEqual(status, 400);
      assert.strictEqual(body.error, "Invalid agent filename");
    });

    it("GET /api/agents/:filename blocks path traversal", async () => {
      const { status, body } = await call("GET", "/api/agents/..%2F..%2Fetc%2Fpasswd.md");
      assert.strictEqual(status, 403);
      assert.strictEqual(body.error, "Access denied");
    });

    it("PUT /api/agents/:filename creates a new agent", async () => {
      const content = "# New Agent\n\nFresh soul.";
      const { status, body } = await call("PUT", "/api/agents/fresh.md", { content });
      assert.strictEqual(status, 200);
      assert.strictEqual(body.ok, true);

      const written = readFileSync(join(workspace, "agents", "fresh.md"), "utf-8");
      assert.strictEqual(written, content);
    });

    it("PUT /api/agents/:filename creates agents dir if missing", async () => {
      assert.ok(!existsSync(join(workspace, "agents")));

      await call("PUT", "/api/agents/first.md", { content: "# First" });

      assert.ok(existsSync(join(workspace, "agents", "first.md")));
    });

    it("PUT /api/agents/:filename updates existing agent", async () => {
      const agentsDir = join(workspace, "agents");
      mkdirSync(agentsDir);
      writeFileSync(join(agentsDir, "old.md"), "# Old Version");

      await call("PUT", "/api/agents/old.md", { content: "# Updated Version" });

      const content = readFileSync(join(agentsDir, "old.md"), "utf-8");
      assert.strictEqual(content, "# Updated Version");
    });

    it("PUT /api/agents/:filename rejects missing content", async () => {
      const { status, body } = await call("PUT", "/api/agents/test.md", {});
      assert.strictEqual(status, 400);
      assert.strictEqual(body.error, "Content is required");
    });

    it("PUT /api/agents/:filename blocks path traversal", async () => {
      const { status, body } = await call("PUT", "/api/agents/..%2Fevil.md", { content: "pwned" });
      assert.strictEqual(status, 403);
      assert.strictEqual(body.error, "Access denied");
    });

    it("DELETE /api/agents/:filename removes an agent", async () => {
      const agentsDir = join(workspace, "agents");
      mkdirSync(agentsDir);
      writeFileSync(join(agentsDir, "doomed.md"), "# Gone Soon");

      const { status, body } = await call("DELETE", "/api/agents/doomed.md");
      assert.strictEqual(status, 200);
      assert.strictEqual(body.ok, true);
      assert.ok(!existsSync(join(agentsDir, "doomed.md")));
    });

    it("DELETE /api/agents/:filename returns 404 for missing agent", async () => {
      const { status, body } = await call("DELETE", "/api/agents/ghost.md");
      assert.strictEqual(status, 404);
      assert.strictEqual(body.error, "Agent not found");
    });

    it("DELETE /api/agents/:filename blocks path traversal", async () => {
      const { status, body } = await call("DELETE", "/api/agents/..%2Fevil.md");
      assert.strictEqual(status, 403);
      assert.strictEqual(body.error, "Access denied");
    });

    it("DELETE /api/agents/:filename rejects non-.md filenames", async () => {
      const { status, body } = await call("DELETE", "/api/agents/bad.txt");
      assert.strictEqual(status, 400);
      assert.strictEqual(body.error, "Invalid agent filename");
    });

    it("GET /api/agents includes level field (default 0 without history)", async () => {
      const agentsDir = join(workspace, "agents");
      mkdirSync(agentsDir);
      writeFileSync(join(agentsDir, "coder.md"), "# Coder\n\nWrites code.");

      const { status, body } = await call("GET", "/api/agents");
      assert.strictEqual(status, 200);
      assert.strictEqual(body[0].level, 0);
    });

    it("PUT /api/agents/:filename initializes soul history and commits", async () => {
      await call("PUT", "/api/agents/tracked.md", { content: "# Tracked\n\nSoul v1." });

      assert.ok(existsSync(join(workspace, ".ghostpaw", "soul-history", "HEAD")));
    });

    it("PUT /api/agents/:filename increments level on successive saves", async () => {
      await call("PUT", "/api/agents/evolving.md", { content: "# V1\n\nFirst." });
      await call("PUT", "/api/agents/evolving.md", { content: "# V2\n\nSecond." });

      const { body } = await call("GET", "/api/agents");
      const evolving = body.find((a: { filename: string }) => a.filename === "evolving.md");
      assert.ok(evolving);
      assert.ok(evolving.level >= 2, `Expected level >= 2 but got ${evolving.level}`);
    });

    it("full lifecycle: create, read, update, list, delete", async () => {
      // Create
      await call("PUT", "/api/agents/lifecycle.md", { content: "# V1\n\nFirst version." });
      let read = await call("GET", "/api/agents/lifecycle.md");
      assert.strictEqual(read.body.content, "# V1\n\nFirst version.");

      // List shows it
      let list = await call("GET", "/api/agents");
      assert.strictEqual(list.body.length, 1);
      assert.strictEqual(list.body[0].filename, "lifecycle.md");
      assert.strictEqual(list.body[0].title, "V1");

      // Update
      await call("PUT", "/api/agents/lifecycle.md", { content: "# V2\n\nRevised." });
      read = await call("GET", "/api/agents/lifecycle.md");
      assert.strictEqual(read.body.content, "# V2\n\nRevised.");

      // Delete
      await call("DELETE", "/api/agents/lifecycle.md");
      list = await call("GET", "/api/agents");
      assert.strictEqual(list.body.length, 0);

      const gone = await call("GET", "/api/agents/lifecycle.md");
      assert.strictEqual(gone.status, 404);
    });
  });

  describe("status endpoint includes agents count", () => {
    it("returns agents count in status", async () => {
      const workspace = mkdtempSync(join(tmpdir(), "gp-test-status-"));
      try {
        const agentsDir = join(workspace, "agents");
        mkdirSync(agentsDir);
        writeFileSync(join(agentsDir, "a.md"), "# A");
        writeFileSync(join(agentsDir, "b.md"), "# B");

        const router = createRouter();
        registerAPIRoutes(router, mockRuntime(workspace) as never);

        const match = router.match("GET", "/api/status");
        assert.ok(match);
        const req = fakeReq("GET", "/api/status");
        const res = fakeRes();
        await match.handler(req, res, {} as never);

        assert.strictEqual(res._status, 200);
        const body = JSON.parse(res._body);
        assert.strictEqual(body.agents, 2);
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });
  });
});
