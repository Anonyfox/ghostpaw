import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { acquireSessionLock } from "./acquire_session_lock.ts";

describe("acquireSessionLock", () => {
  it("acquires and releases a lock", async () => {
    const release = await acquireSessionLock(1);
    ok(typeof release === "function");
    release();
  });

  it("serializes concurrent calls on the same session", async () => {
    const order: number[] = [];

    const r1 = await acquireSessionLock(100);
    const p2 = acquireSessionLock(100).then((release) => {
      order.push(2);
      release();
    });
    const p3 = acquireSessionLock(100).then((release) => {
      order.push(3);
      release();
    });

    order.push(1);
    r1();

    await p2;
    await p3;
    deepStrictEqual(order, [1, 2, 3]);
  });

  it("allows independent sessions to run in parallel", async () => {
    const log: string[] = [];

    const r1 = await acquireSessionLock(200);
    const r2 = await acquireSessionLock(201);

    log.push("both-acquired");
    r1();
    r2();
    log.push("both-released");

    strictEqual(log.length, 2);
  });

  it("cleans up after the last holder releases", async () => {
    const r1 = await acquireSessionLock(300);
    r1();
    const r2 = await acquireSessionLock(300);
    r2();
    ok(true);
  });

  it("serializes even with async work inside the lock", async () => {
    const order: number[] = [];

    const r1 = await acquireSessionLock(400);
    const p2 = acquireSessionLock(400).then(async (release) => {
      await new Promise((r) => setTimeout(r, 10));
      order.push(2);
      release();
    });

    await new Promise((r) => setTimeout(r, 5));
    order.push(1);
    r1();

    await p2;
    deepStrictEqual(order, [1, 2]);
  });
});
