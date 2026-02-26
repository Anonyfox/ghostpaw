import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createRateLimiter } from "./rate_limiter.ts";

describe("createRateLimiter", () => {
  it("allows requests under the limit", () => {
    const limiter = createRateLimiter(5, 60_000);
    strictEqual(limiter.check("192.168.1.1"), true);
    strictEqual(limiter.check("192.168.1.1"), true);
    strictEqual(limiter.check("192.168.1.1"), true);
  });

  it("first request always passes", () => {
    const limiter = createRateLimiter(1, 60_000);
    strictEqual(limiter.check("10.0.0.1"), true);
  });

  it("blocks the request that exceeds the limit", () => {
    const limiter = createRateLimiter(2, 60_000);
    strictEqual(limiter.check("192.168.1.1"), true);
    strictEqual(limiter.check("192.168.1.1"), true);
    strictEqual(limiter.check("192.168.1.1"), false);
  });

  it("exactly at limit: request N is allowed, request N+1 is blocked", () => {
    const limiter = createRateLimiter(3, 60_000);
    strictEqual(limiter.check("127.0.0.1"), true);
    strictEqual(limiter.check("127.0.0.1"), true);
    strictEqual(limiter.check("127.0.0.1"), true);
    strictEqual(limiter.check("127.0.0.1"), false);
  });

  it("different IPs have independent counters", () => {
    const limiter = createRateLimiter(1, 60_000);
    strictEqual(limiter.check("1.1.1.1"), true);
    strictEqual(limiter.check("1.1.1.1"), false);
    strictEqual(limiter.check("2.2.2.2"), true);
    strictEqual(limiter.check("2.2.2.2"), false);
  });

  it("resets after window expires", async () => {
    const limiter = createRateLimiter(2, 50);
    strictEqual(limiter.check("192.168.1.1"), true);
    strictEqual(limiter.check("192.168.1.1"), true);
    strictEqual(limiter.check("192.168.1.1"), false);
    await new Promise((r) => setTimeout(r, 60));
    strictEqual(limiter.check("192.168.1.1"), true);
  });

  it("cleanup does not break subsequent checks", async () => {
    const limiter = createRateLimiter(1, 10);
    limiter.check("1.1.1.1");
    strictEqual(limiter.check("1.1.1.1"), false);
    await new Promise((r) => setTimeout(r, 20));
    limiter.cleanup();
    strictEqual(limiter.check("1.1.1.1"), true);
  });
});
