import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createSessionToken } from "./create_session_token.ts";

describe("createSessionToken", () => {
  it("returns a string containing a dot", () => {
    const token = createSessionToken("secret");
    strictEqual(token.includes("."), true);
  });

  it("produces different tokens with same secret due to nonce", () => {
    const secret = "my-secret";
    const t1 = createSessionToken(secret);
    const t2 = createSessionToken(secret);
    strictEqual(t1 !== t2, true);
  });

  it("produces different tokens with different secrets", () => {
    const t1 = createSessionToken("secret-a");
    const t2 = createSessionToken("secret-b");
    strictEqual(t1 !== t2, true);
  });
});
