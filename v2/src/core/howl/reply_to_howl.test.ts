import { ok, rejects, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { TurnResult } from "../chat/index.ts";
import { createSession, initChatTables } from "../chat/index.ts";
import type { Entity } from "../../harness/types.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { getHowl } from "./get_howl.ts";
import { replyToHowl } from "./reply_to_howl.ts";
import { initHowlTables } from "./schema.ts";
import { storeHowl } from "./store_howl.ts";
import { updateHowlStatus } from "./update_howl.ts";

let db: DatabaseHandle;

function makeTurnResult(content: string): TurnResult {
  return {
    content,
    succeeded: true,
    messageId: 1,
    model: "test",
    usage: { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, cachedTokens: 0, totalTokens: 0 },
    cost: { estimatedUsd: 0 },
  };
}

function mockEntity(db: DatabaseHandle, responseContent = "Got it, thanks!"): Entity {
  let lastSessionId: number | undefined;
  let lastContent: string | undefined;
  return {
    db,
    workspace: "/tmp",
    async executeTurn(sessionId: number, content: string) {
      lastSessionId = sessionId;
      lastContent = content;
      return makeTurnResult(responseContent);
    },
    async *streamTurn() {
      yield "";
      return makeTurnResult(responseContent);
    },
    async flush() {},
    get _lastSessionId() {
      return lastSessionId;
    },
    get _lastContent() {
      return lastContent;
    },
  } as Entity & { _lastSessionId: number | undefined; _lastContent: string | undefined };
}

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initHowlTables(db);
});

afterEach(() => {
  db.close();
});

describe("replyToHowl", () => {
  it("processes a reply and marks the howl as responded", async () => {
    const session = createSession(db, "howl:1", { purpose: "howl" });
    const howl = storeHowl(db, {
      sessionId: session.id as number,
      message: "Should I proceed with the deploy?",
      urgency: "low",
    });

    const entity = mockEntity(db);
    const result = await replyToHowl(db, entity, howl.id, "Yes, go ahead.");

    strictEqual(result.howlId, howl.id);
    strictEqual(result.turn.content, "Got it, thanks!");
    strictEqual(result.turn.succeeded, true);

    const updated = getHowl(db, howl.id);
    ok(updated !== null);
    strictEqual(updated.status, "responded");
    ok(updated.respondedAt !== null);
  });

  it("routes to the howl session, not a new one", async () => {
    const session = createSession(db, "howl:1", { purpose: "howl" });
    const howl = storeHowl(db, {
      sessionId: session.id as number,
      message: "question",
      urgency: "low",
    });

    const entity = mockEntity(db) as Entity & { _lastSessionId: number | undefined };
    await replyToHowl(db, entity, howl.id, "answer");

    strictEqual(entity._lastSessionId, session.id);
  });

  it("prepends cross-channel note when reply channel differs", async () => {
    const session = createSession(db, "howl:1", { purpose: "howl" });
    const howl = storeHowl(db, {
      sessionId: session.id as number,
      message: "question",
      urgency: "low",
      channel: "telegram",
    });

    const entity = mockEntity(db) as Entity & { _lastContent: string | undefined };
    await replyToHowl(db, entity, howl.id, "answer", { replyChannel: "web" });

    ok(entity._lastContent?.includes("[Delivered via telegram. Reply received on web.]"));
    ok(entity._lastContent?.includes("answer"));
  });

  it("does not prepend note when channels match", async () => {
    const session = createSession(db, "howl:1", { purpose: "howl" });
    const howl = storeHowl(db, {
      sessionId: session.id as number,
      message: "question",
      urgency: "low",
      channel: "telegram",
    });

    const entity = mockEntity(db) as Entity & { _lastContent: string | undefined };
    await replyToHowl(db, entity, howl.id, "answer", { replyChannel: "telegram" });

    strictEqual(entity._lastContent, "answer");
  });

  it("throws for nonexistent howl", async () => {
    const entity = mockEntity(db);
    await rejects(() => replyToHowl(db, entity, 999, "hello"), /not found/i);
  });

  it("throws for already responded howl", async () => {
    const session = createSession(db, "howl:1", { purpose: "howl" });
    const howl = storeHowl(db, {
      sessionId: session.id as number,
      message: "question",
      urgency: "low",
    });
    updateHowlStatus(db, howl.id, "responded");

    const entity = mockEntity(db);
    await rejects(() => replyToHowl(db, entity, howl.id, "late reply"), /already "responded"/i);
  });

  it("throws for dismissed howl", async () => {
    const session = createSession(db, "howl:1", { purpose: "howl" });
    const howl = storeHowl(db, {
      sessionId: session.id as number,
      message: "question",
      urgency: "low",
    });
    updateHowlStatus(db, howl.id, "dismissed");

    const entity = mockEntity(db);
    await rejects(() => replyToHowl(db, entity, howl.id, "reply"), /already "dismissed"/i);
  });
});
