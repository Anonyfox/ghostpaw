import { ok } from "node:assert";
import { describe, it } from "node:test";
import type { DefaultSoul, DefaultTrait } from "./default_soul_types.ts";

describe("DefaultSoul types", () => {
  it("structures are assignable from well-formed objects", () => {
    const trait: DefaultTrait = { principle: "p", provenance: "prov" };
    const soul: DefaultSoul = {
      slug: "test",
      name: "Test",
      essence: "e",
      description: "d",
      traits: [trait],
    };
    ok(soul.traits.length > 0);
  });
});
