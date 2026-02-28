import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { ChatFactory, ChatInstance } from "./chat_instance.ts";

describe("ChatInstance", () => {
  it("is satisfiable by a mock object", () => {
    const mock: ChatInstance = {
      system() {
        return this;
      },
      user() {
        return this;
      },
      assistant() {
        return this;
      },
      addTool() {
        return this;
      },
      async generate() {
        return "response";
      },
      async *stream() {
        yield "chunk";
      },
      get lastResult() {
        return null;
      },
    };
    ok(mock);
    strictEqual(mock.lastResult, null);
  });

  it("chaining methods return ChatInstance", () => {
    const mock: ChatInstance = {
      system() {
        return this;
      },
      user() {
        return this;
      },
      assistant() {
        return this;
      },
      addTool() {
        return this;
      },
      async generate() {
        return "ok";
      },
      async *stream() {
        yield "ok";
      },
      get lastResult() {
        return null;
      },
    };
    const result = mock.system("sys").user("usr").assistant("ast");
    ok(result);
  });
});

describe("ChatFactory", () => {
  it("is a function from model string to ChatInstance", () => {
    const factory: ChatFactory = (_model: string) => ({
      system() {
        return this;
      },
      user() {
        return this;
      },
      assistant() {
        return this;
      },
      addTool() {
        return this;
      },
      async generate() {
        return "response";
      },
      async *stream() {
        yield "chunk";
      },
      get lastResult() {
        return null;
      },
    });
    const instance = factory("gpt-4o");
    ok(instance);
    strictEqual(typeof factory, "function");
  });
});
