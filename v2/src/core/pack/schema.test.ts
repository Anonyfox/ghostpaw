import { doesNotThrow, ok } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { initPackTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
});

describe("initPackTables", () => {
  it("creates pack_members and pack_interactions tables", () => {
    initPackTables(db);
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'pack_%' ORDER BY name`,
      )
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);
    ok(names.includes("pack_interactions"));
    ok(names.includes("pack_members"));
  });

  it("is idempotent — calling twice does not throw", () => {
    initPackTables(db);
    doesNotThrow(() => initPackTables(db));
  });

  it("creates indexes on pack_members", () => {
    initPackTables(db);
    const indexes = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_pack_members%'`,
      )
      .all() as { name: string }[];
    const names = indexes.map((i) => i.name);
    ok(names.includes("idx_pack_members_name"));
    ok(names.includes("idx_pack_members_status"));
  });

  it("creates index on pack_interactions", () => {
    initPackTables(db);
    const indexes = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_pack_interactions%'`,
      )
      .all() as { name: string }[];
    ok(indexes.some((i) => i.name === "idx_pack_interactions_member"));
  });

  it("enforces kind CHECK constraint on pack_members", () => {
    initPackTables(db);
    const now = Date.now();
    let threw = false;
    try {
      db.prepare(
        `INSERT INTO pack_members (name, kind, first_contact, last_contact, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run("test", "invalid_kind", now, now, now, now);
    } catch {
      threw = true;
    }
    ok(threw, "Should reject invalid kind");
  });

  it("enforces status CHECK constraint on pack_members", () => {
    initPackTables(db);
    const now = Date.now();
    let threw = false;
    try {
      db.prepare(
        `INSERT INTO pack_members (name, kind, status, first_contact, last_contact, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run("test", "human", "invalid_status", now, now, now, now);
    } catch {
      threw = true;
    }
    ok(threw, "Should reject invalid status");
  });

  it("enforces kind CHECK constraint on pack_interactions", () => {
    initPackTables(db);
    const now = Date.now();
    db.prepare(
      `INSERT INTO pack_members (name, kind, first_contact, last_contact, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run("alice", "human", now, now, now, now);

    let threw = false;
    try {
      db.prepare(
        `INSERT INTO pack_interactions (member_id, kind, summary, created_at)
         VALUES (?, ?, ?, ?)`,
      ).run(1, "bad_kind", "test", now);
    } catch {
      threw = true;
    }
    ok(threw, "Should reject invalid interaction kind");
  });

  it("enforces foreign key on pack_interactions.member_id", () => {
    initPackTables(db);
    let threw = false;
    try {
      db.prepare(
        `INSERT INTO pack_interactions (member_id, kind, summary, created_at)
         VALUES (?, ?, ?, ?)`,
      ).run(999, "conversation", "test", Date.now());
    } catch {
      threw = true;
    }
    ok(threw, "Should reject nonexistent member_id");
  });

  it("enforces unique name among active/dormant members", () => {
    initPackTables(db);
    const now = Date.now();
    db.prepare(
      `INSERT INTO pack_members (name, kind, first_contact, last_contact, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run("alice", "human", now, now, now, now);

    let threw = false;
    try {
      db.prepare(
        `INSERT INTO pack_members (name, kind, first_contact, last_contact, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run("alice", "human", now, now, now, now);
    } catch {
      threw = true;
    }
    ok(threw, "Should reject duplicate active name");
  });

  it("allows duplicate name when one is lost", () => {
    initPackTables(db);
    const now = Date.now();
    db.prepare(
      `INSERT INTO pack_members (name, kind, status, first_contact, last_contact, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run("alice", "human", "lost", now, now, now, now);

    doesNotThrow(() => {
      db.prepare(
        `INSERT INTO pack_members (name, kind, first_contact, last_contact, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run("alice", "human", now, now, now, now);
    });
  });
});
