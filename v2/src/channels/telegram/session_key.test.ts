import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { chatIdFromSessionKey, sessionKeyForChat } from "./session_key.ts";

describe("sessionKeyForChat", () => {
  it("creates a namespaced key from chat ID", () => {
    strictEqual(sessionKeyForChat(12345), "telegram:12345");
  });

  it("handles negative chat IDs (groups)", () => {
    strictEqual(sessionKeyForChat(-100123456), "telegram:-100123456");
  });

  it("handles zero", () => {
    strictEqual(sessionKeyForChat(0), "telegram:0");
  });
});

describe("chatIdFromSessionKey", () => {
  it("extracts chat ID from a valid key", () => {
    strictEqual(chatIdFromSessionKey("telegram:12345"), 12345);
  });

  it("handles negative chat IDs (groups)", () => {
    strictEqual(chatIdFromSessionKey("telegram:-100123456"), -100123456);
  });

  it("returns null for non-telegram keys", () => {
    strictEqual(chatIdFromSessionKey("web:chat:123"), null);
    strictEqual(chatIdFromSessionKey("cli:run:456"), null);
  });

  it("returns null for malformed keys", () => {
    strictEqual(chatIdFromSessionKey("telegram:abc"), null);
    strictEqual(chatIdFromSessionKey("telegram:"), null);
    strictEqual(chatIdFromSessionKey(""), null);
  });

  it("roundtrips with sessionKeyForChat", () => {
    strictEqual(chatIdFromSessionKey(sessionKeyForChat(42)), 42);
    strictEqual(chatIdFromSessionKey(sessionKeyForChat(-100999)), -100999);
  });
});
