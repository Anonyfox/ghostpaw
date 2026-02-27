import { rejects, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { waitFor } from "./wait_for.ts";

describe("waitFor", () => {
  it("resolves immediately when condition is already true", async () => {
    await waitFor(() => true);
  });

  it("resolves once condition becomes true", async () => {
    let ready = false;
    setTimeout(() => {
      ready = true;
    }, 20);
    await waitFor(() => ready, 500);
    strictEqual(ready, true);
  });

  it("rejects after timeout when condition never becomes true", async () => {
    await rejects(() => waitFor(() => false, 50), /condition not met within 50ms/);
  });
});
