import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRouter } from "./router.js";
import { registerAPIRoutes } from "./routes-api.js";

function mockRuntime() {
  return {
    workspace: "/tmp",
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
        model: "test",
        headMessageId: null,
        tokenBudget: null,
        metadata: null,
        absorbedAt: null,
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
});
