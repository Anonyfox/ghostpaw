import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { Entity, EntityOptions, EntityTurnOptions } from "./types.ts";

describe("EntityOptions", () => {
  it("requires db and workspace", () => {
    const opts: EntityOptions = {
      db: {} as EntityOptions["db"],
      workspace: "/tmp",
    };
    strictEqual(opts.workspace, "/tmp");
    strictEqual(opts.chatFactory, undefined);
  });

  it("accepts optional chatFactory", () => {
    const factory = (_model: string) =>
      ({}) as ReturnType<NonNullable<EntityOptions["chatFactory"]>>;
    const opts: EntityOptions = {
      db: {} as EntityOptions["db"],
      workspace: "/tmp",
      chatFactory: factory,
    };
    ok(opts.chatFactory);
  });
});

describe("EntityTurnOptions", () => {
  it("all fields are optional", () => {
    const opts: EntityTurnOptions = {};
    strictEqual(opts.model, undefined);
    strictEqual(opts.soulId, undefined);
    strictEqual(opts.onTitleGenerated, undefined);
  });

  it("accepts all fields", () => {
    const opts: EntityTurnOptions = {
      model: "gpt-4o",
      soulId: 1,
      onTitleGenerated: () => {},
    };
    strictEqual(opts.model, "gpt-4o");
    strictEqual(opts.soulId, 1);
    ok(typeof opts.onTitleGenerated === "function");
  });
});

describe("Entity", () => {
  it("has db, workspace, streamTurn, and executeTurn", () => {
    const entity = {
      db: {
        exec() {},
        prepare() {
          return {} as never;
        },
        close() {},
      },
      workspace: "/tmp",
      async *streamTurn() {
        yield "";
        return {
          succeeded: true,
          messageId: 1,
          userMessageId: 1,
          content: "",
          model: "",
          usage: {
            inputTokens: 0,
            outputTokens: 0,
            reasoningTokens: 0,
            cachedTokens: 0,
            totalTokens: 0,
          },
          cost: { estimatedUsd: 0 },
          iterations: 1,
        };
      },
      async executeTurn() {
        return {
          succeeded: true,
          messageId: 1,
          userMessageId: 1,
          content: "",
          model: "",
          usage: {
            inputTokens: 0,
            outputTokens: 0,
            reasoningTokens: 0,
            cachedTokens: 0,
            totalTokens: 0,
          },
          cost: { estimatedUsd: 0 },
          iterations: 1,
        };
      },
      async flush() {},
    } satisfies Entity;
    ok(entity.db);
    strictEqual(entity.workspace, "/tmp");
    ok(typeof entity.streamTurn === "function");
    ok(typeof entity.executeTurn === "function");
    ok(typeof entity.flush === "function");
  });
});
