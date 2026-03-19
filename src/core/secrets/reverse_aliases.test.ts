import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { PROVIDER_ALIASES } from "./provider_aliases.ts";
import { REVERSE_ALIASES } from "./reverse_aliases.ts";

describe("REVERSE_ALIASES", () => {
  it("maps API_KEY_ANTHROPIC to ANTHROPIC_API_KEY", () => {
    strictEqual(REVERSE_ALIASES.API_KEY_ANTHROPIC, "ANTHROPIC_API_KEY");
  });

  it("maps API_KEY_OPENAI to OPENAI_API_KEY", () => {
    strictEqual(REVERSE_ALIASES.API_KEY_OPENAI, "OPENAI_API_KEY");
  });

  it("maps API_KEY_XAI to XAI_API_KEY", () => {
    strictEqual(REVERSE_ALIASES.API_KEY_XAI, "XAI_API_KEY");
  });

  it("is consistent with PROVIDER_ALIASES (each pair is bidirectional)", () => {
    for (const [alias, canonical] of Object.entries(PROVIDER_ALIASES)) {
      strictEqual(REVERSE_ALIASES[canonical], alias);
    }
  });
});
