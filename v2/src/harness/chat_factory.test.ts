import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { defaultChatFactory } from "./chat_factory.ts";

describe("defaultChatFactory", () => {
  it("returns an object with ChatInstance methods", () => {
    const instance = defaultChatFactory("gpt-4o");
    ok(typeof instance.system === "function");
    ok(typeof instance.user === "function");
    ok(typeof instance.assistant === "function");
    ok(typeof instance.addTool === "function");
    ok(typeof instance.generate === "function");
    ok(typeof instance.stream === "function");
  });

  it("system() returns the instance for chaining", () => {
    const instance = defaultChatFactory("gpt-4o");
    const result = instance.system("test prompt");
    strictEqual(result, instance);
  });

  it("user() returns the instance for chaining", () => {
    const instance = defaultChatFactory("gpt-4o");
    const result = instance.user("hello");
    strictEqual(result, instance);
  });

  it("assistant() returns the instance for chaining", () => {
    const instance = defaultChatFactory("gpt-4o");
    const result = instance.assistant("hi");
    strictEqual(result, instance);
  });
});
