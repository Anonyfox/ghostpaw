import { ok } from "node:assert";
import { describe, it } from "node:test";
import type { TraitSnapshot } from "./trait_snapshot.ts";

describe("TraitSnapshot", () => {
  it("structure is assignable from a well-formed object", () => {
    const snap: TraitSnapshot = {
      id: 1,
      principle: "p",
      provenance: "prov",
      generation: 0,
      status: "active",
      createdAt: Date.now(),
    };
    ok(snap.id > 0);
  });
});
