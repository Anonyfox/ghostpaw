import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkGeneralRateLimit, resetGeneralBuckets } from "./rate-limit.js";

describe("general rate limiter", () => {
  it("allows requests under the limit", () => {
    resetGeneralBuckets();
    for (let i = 0; i < 100; i++) {
      assert.ok(checkGeneralRateLimit("192.168.1.1"));
    }
  });

  it("blocks requests over the limit", () => {
    resetGeneralBuckets();
    for (let i = 0; i < 100; i++) {
      checkGeneralRateLimit("192.168.1.2");
    }
    assert.ok(!checkGeneralRateLimit("192.168.1.2"));
  });

  it("tracks IPs independently", () => {
    resetGeneralBuckets();
    for (let i = 0; i < 100; i++) {
      checkGeneralRateLimit("192.168.1.3");
    }
    assert.ok(checkGeneralRateLimit("192.168.1.4"));
  });

  it("resets after cleanup", () => {
    resetGeneralBuckets();
    for (let i = 0; i < 100; i++) {
      checkGeneralRateLimit("192.168.1.5");
    }
    assert.ok(!checkGeneralRateLimit("192.168.1.5"));
    resetGeneralBuckets();
    assert.ok(checkGeneralRateLimit("192.168.1.5"));
  });
});
