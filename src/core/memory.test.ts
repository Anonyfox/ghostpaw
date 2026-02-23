import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { createDatabase, type GhostpawDatabase } from "./database.js";
import { createMemoryStore, type MemoryStore } from "./memory.js";

let db: GhostpawDatabase;
let store: MemoryStore;

function fakeEmbedding(seed: number, dims = 8): number[] {
  const vec: number[] = [];
  for (let i = 0; i < dims; i++) {
    vec.push(Math.sin(seed * (i + 1) * 0.7));
  }
  return vec;
}

beforeEach(async () => {
  db = await createDatabase(":memory:");
  store = createMemoryStore(db);
});

describe("MemoryStore - store", () => {
  it("stores a memory with content and embedding", () => {
    const embedding = fakeEmbedding(1);
    const mem = store.store("The sky is blue", embedding, { source: "conversation" });
    ok(mem.id.length > 0);
    strictEqual(mem.content, "The sky is blue");
    strictEqual(mem.source, "conversation");
    strictEqual(mem.sessionId, null);
    ok(mem.createdAt > 0);
  });

  it("stores a memory scoped to a session", () => {
    const embedding = fakeEmbedding(2);
    const mem = store.store("Session-specific fact", embedding, { sessionId: "sess-1" });
    strictEqual(mem.sessionId, "sess-1");
  });

  it("stores a memory with default source", () => {
    const mem = store.store("Some info", fakeEmbedding(3));
    strictEqual(mem.source, "manual");
  });

  it("stores multiple memories with unique ids", () => {
    const m1 = store.store("Fact one", fakeEmbedding(1));
    const m2 = store.store("Fact two", fakeEmbedding(2));
    ok(m1.id !== m2.id);
  });
});

describe("MemoryStore - get", () => {
  it("retrieves a memory by id", () => {
    const created = store.store("Hello world", fakeEmbedding(1));
    const found = store.get(created.id);
    ok(found);
    strictEqual(found.id, created.id);
    strictEqual(found.content, "Hello world");
  });

  it("returns null for non-existent id", () => {
    strictEqual(store.get("nonexistent"), null);
  });
});

describe("MemoryStore - delete", () => {
  it("deletes a memory by id", () => {
    const mem = store.store("To delete", fakeEmbedding(1));
    store.delete(mem.id);
    strictEqual(store.get(mem.id), null);
  });

  it("is a no-op for non-existent id", () => {
    store.delete("nonexistent");
  });
});

describe("MemoryStore - deleteBySession", () => {
  it("deletes all memories for a specific session", () => {
    store.store("Global", fakeEmbedding(1));
    store.store("Sess A", fakeEmbedding(2), { sessionId: "a" });
    store.store("Sess A too", fakeEmbedding(3), { sessionId: "a" });
    store.store("Sess B", fakeEmbedding(4), { sessionId: "b" });

    store.deleteBySession("a");

    const all = store.list();
    strictEqual(all.length, 2);
    ok(all.every((m) => m.sessionId !== "a"));
  });
});

describe("MemoryStore - list", () => {
  it("lists all memories", () => {
    store.store("One", fakeEmbedding(1));
    store.store("Two", fakeEmbedding(2));
    store.store("Three", fakeEmbedding(3));
    const all = store.list();
    strictEqual(all.length, 3);
  });

  it("lists memories filtered by session", () => {
    store.store("Global", fakeEmbedding(1));
    store.store("Sess", fakeEmbedding(2), { sessionId: "s1" });
    store.store("Another Sess", fakeEmbedding(3), { sessionId: "s1" });

    const sessOnly = store.list("s1");
    strictEqual(sessOnly.length, 2);
    ok(sessOnly.every((m) => m.sessionId === "s1"));
  });

  it("returns empty array when no memories exist", () => {
    deepStrictEqual(store.list(), []);
  });
});

describe("MemoryStore - search (2-phase)", () => {
  it("finds the most similar memory by vector", () => {
    const target = fakeEmbedding(42);
    store.store("Unrelated", fakeEmbedding(1));
    store.store("The answer", target);
    store.store("Also unrelated", fakeEmbedding(100));

    const results = store.search(target, { k: 1 });
    strictEqual(results.length, 1);
    strictEqual(results[0]!.content, "The answer");
    ok(results[0]!.score > 0.99);
  });

  it("returns top-k results ordered by similarity", () => {
    const base = fakeEmbedding(10);
    const close = fakeEmbedding(10.1);
    const medium = fakeEmbedding(12);
    const far = fakeEmbedding(50);

    store.store("Close", close);
    store.store("Far", far);
    store.store("Medium", medium);

    const results = store.search(base, { k: 3 });
    strictEqual(results.length, 3);
    ok(results[0]!.score >= results[1]!.score);
    ok(results[1]!.score >= results[2]!.score);
    strictEqual(results[0]!.content, "Close");
  });

  it("respects minimum score threshold", () => {
    store.store("Similar", fakeEmbedding(5));
    store.store("Opposite-ish", fakeEmbedding(500));

    const results = store.search(fakeEmbedding(5), { k: 10, minScore: 0.99 });
    strictEqual(results.length, 1);
    strictEqual(results[0]!.content, "Similar");
  });

  it("scopes search to a session", () => {
    store.store("Global fact", fakeEmbedding(1));
    store.store("Session fact", fakeEmbedding(1), { sessionId: "s1" });
    store.store("Other session", fakeEmbedding(1), { sessionId: "s2" });

    const results = store.search(fakeEmbedding(1), { k: 10, sessionId: "s1" });
    strictEqual(results.length, 1);
    strictEqual(results[0]!.sessionId, "s1");
  });

  it("includes global memories when includeGlobal is set with session scope", () => {
    store.store("Global", fakeEmbedding(1));
    store.store("In session", fakeEmbedding(1), { sessionId: "s1" });
    store.store("Other session", fakeEmbedding(1), { sessionId: "s2" });

    const results = store.search(fakeEmbedding(1), {
      k: 10,
      sessionId: "s1",
      includeGlobal: true,
    });
    strictEqual(results.length, 2);
    const ids = results.map((r) => r.content);
    ok(ids.includes("Global"));
    ok(ids.includes("In session"));
  });

  it("returns empty array when no memories exist", () => {
    const results = store.search(fakeEmbedding(1), { k: 5 });
    deepStrictEqual(results, []);
  });

  it("returns empty when no embeddings match threshold", () => {
    store.store("Something", fakeEmbedding(1));
    const results = store.search(fakeEmbedding(999), { k: 5, minScore: 0.999 });
    strictEqual(results.length, 0);
  });

  it("only hydrates top-k rows (efficiency check via count)", () => {
    for (let i = 0; i < 50; i++) {
      store.store(`Memory ${i}`, fakeEmbedding(i));
    }
    const results = store.search(fakeEmbedding(25), { k: 3 });
    strictEqual(results.length, 3);
    ok(results[0]!.content.length > 0);
    ok(results[0]!.id.length > 0);
  });

  it("handles memories without embeddings gracefully", () => {
    db.sqlite
      .prepare(
        "INSERT INTO memory (id, session_id, content, embedding, created_at, source) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run("no-vec", null, "No embedding", null, Date.now(), "manual");

    const results = store.search(fakeEmbedding(1), { k: 5 });
    ok(results.every((r) => r.id !== "no-vec"));
  });
});

describe("MemoryStore - count", () => {
  it("returns total count of memories", () => {
    store.store("A", fakeEmbedding(1));
    store.store("B", fakeEmbedding(2));
    strictEqual(store.count(), 2);
  });

  it("returns count filtered by session", () => {
    store.store("Global", fakeEmbedding(1));
    store.store("Sess", fakeEmbedding(2), { sessionId: "s1" });
    strictEqual(store.count("s1"), 1);
  });

  it("returns 0 when empty", () => {
    strictEqual(store.count(), 0);
  });
});
