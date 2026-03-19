import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../../../../lib/index.ts";
import { openTestDatabase } from "../../../../../lib/index.ts";
import { storeHowl, updateHowlDelivery, updateHowlStatus } from "../../../internal/howls/index.ts";
import { initChatTables, initHowlTables } from "../../../runtime/index.ts";
import { createSession } from "../../write/index.ts";
import {
  countPendingHowls,
  getHowlByTelegramReplyTarget,
  getPendingHowlCountForTelegramChat,
  getResolvableTelegramHowlFromPlainText,
} from "./get_pending_howl.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initHowlTables(db);
});

afterEach(() => {
  db.close();
});

describe("getHowlByTelegramReplyTarget", () => {
  it("returns null when no matching howl exists", () => {
    strictEqual(getHowlByTelegramReplyTarget(db, 42, 7), null);
  });

  it("finds a pending howl by telegram message id", () => {
    const s = createSession(db, "chat:1");
    const howl = storeHowl(db, {
      sessionId: createSession(db, "howl:1", { purpose: "howl" }).id as number,
      originSessionId: s.id as number,
      message: "first",
      urgency: "low",
    });
    updateHowlDelivery(db, howl.id, {
      channel: "telegram",
      deliveryAddress: "42",
      deliveryMessageId: "7",
      deliveryMode: "push",
    });

    const pending = getHowlByTelegramReplyTarget(db, 42, 7);
    ok(pending !== null);
    strictEqual(pending.message, "first");
  });
});

describe("getResolvableTelegramHowlFromPlainText", () => {
  it("returns null when no pending howl is routed to the chat", () => {
    strictEqual(getResolvableTelegramHowlFromPlainText(db, 42), null);
  });

  it("returns the pending howl when it is the only unresolved telegram howl for that chat", () => {
    const s = createSession(db, "chat:2");
    createSession(db, "telegram:42", { purpose: "chat" });
    const howl = storeHowl(db, {
      sessionId: createSession(db, "howl:2", { purpose: "howl" }).id as number,
      originSessionId: s.id as number,
      message: "old",
      urgency: "low",
    });
    updateHowlDelivery(db, howl.id, {
      channel: "telegram",
      deliveryAddress: "42",
      deliveryMessageId: "11",
      deliveryMode: "push",
    });

    const pending = getResolvableTelegramHowlFromPlainText(db, 42);
    ok(pending !== null);
    strictEqual(pending.id, howl.id);
  });

  it("returns null when more than one unresolved telegram howl exists", () => {
    const s = createSession(db, "chat:2");
    const h1 = storeHowl(db, {
      sessionId: createSession(db, "howl:2:1", { purpose: "howl" }).id as number,
      originSessionId: s.id as number,
      message: "old",
      urgency: "low",
    });
    const h2 = storeHowl(db, {
      sessionId: createSession(db, "howl:2:2", { purpose: "howl" }).id as number,
      originSessionId: s.id as number,
      message: "new",
      urgency: "low",
    });
    updateHowlDelivery(db, h1.id, {
      channel: "telegram",
      deliveryAddress: "42",
      deliveryMessageId: "11",
      deliveryMode: "push",
    });
    updateHowlDelivery(db, h2.id, {
      channel: "telegram",
      deliveryAddress: "42",
      deliveryMessageId: "12",
      deliveryMode: "push",
    });

    strictEqual(getResolvableTelegramHowlFromPlainText(db, 42), null);
  });

  it("returns null when normal direct chat continued after the howl", () => {
    const s = createSession(db, "chat:3");
    const h1 = storeHowl(db, {
      sessionId: createSession(db, "howl:3", { purpose: "howl" }).id as number,
      originSessionId: s.id as number,
      message: "done",
      urgency: "low",
    });
    updateHowlDelivery(db, h1.id, {
      channel: "telegram",
      deliveryAddress: "99",
      deliveryMessageId: "21",
      deliveryMode: "push",
    });
    const chatSession = createSession(db, "telegram:99", { purpose: "chat" });
    db.prepare("UPDATE sessions SET last_active_at = ? WHERE id = ?").run(
      Date.now() + 1_000,
      chatSession.id,
    );

    strictEqual(getResolvableTelegramHowlFromPlainText(db, 99), null);
  });
});

describe("countPendingHowls", () => {
  it("returns 0 when no howls exist", () => {
    strictEqual(countPendingHowls(db), 0);
  });

  it("counts only pending howls", () => {
    const s = createSession(db, "chat:4");
    const h1 = storeHowl(db, {
      sessionId: createSession(db, "howl:4:1", { purpose: "howl" }).id as number,
      originSessionId: s.id as number,
      message: "a",
      urgency: "low",
    });
    storeHowl(db, {
      sessionId: createSession(db, "howl:4:2", { purpose: "howl" }).id as number,
      originSessionId: s.id as number,
      message: "b",
      urgency: "low",
    });
    updateHowlStatus(db, h1.id, "responded");

    strictEqual(countPendingHowls(db), 1);
  });
});

describe("getPendingHowlCountForTelegramChat", () => {
  it("counts unresolved telegram howls per chat", () => {
    const s = createSession(db, "chat:5");
    const howl1 = storeHowl(db, {
      sessionId: createSession(db, "howl:5:1", { purpose: "howl" }).id as number,
      originSessionId: s.id as number,
      message: "a",
      urgency: "low",
    });
    const howl2 = storeHowl(db, {
      sessionId: createSession(db, "howl:5:2", { purpose: "howl" }).id as number,
      originSessionId: s.id as number,
      message: "b",
      urgency: "low",
    });
    updateHowlDelivery(db, howl1.id, {
      channel: "telegram",
      deliveryAddress: "7",
      deliveryMessageId: "1",
      deliveryMode: "push",
    });
    updateHowlDelivery(db, howl2.id, {
      channel: "telegram",
      deliveryAddress: "8",
      deliveryMessageId: "2",
      deliveryMode: "push",
    });

    strictEqual(getPendingHowlCountForTelegramChat(db, 7), 1);
    strictEqual(getPendingHowlCountForTelegramChat(db, 8), 1);
  });
});
