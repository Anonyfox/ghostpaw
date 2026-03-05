import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { phaseTransitions } from "./phase_transitions.ts";

describe("phaseTransitions", () => {
  it("returns low count for homogeneous text at sigma=1.0", () => {
    const sents = [
      "DNS resolves domain names to IP addresses.",
      "The resolver queries root servers first.",
      "Then it queries the TLD nameserver.",
      "Finally the authoritative server responds.",
      "The response is cached with a TTL.",
    ];
    ok(phaseTransitions(sents, 1.0).count <= 1);
  });

  it("detects transitions at topic boundaries", () => {
    const sents = [
      "The recursive resolver queries root nameservers for delegation.",
      "Root servers return TLD referrals to the resolver.",
      "The resolver caches responses according to TTL values.",
      "The resolver then queries the authoritative nameserver.",
      "DNS responses include A records and AAAA records.",
      "Osip Mandelstam wrote poetry in a transit camp.",
      "His wife Nadezhda memorized every poem by heart.",
      "She carried the poems in her body for forty years.",
      "The persistence layer for Russian poetry was a nervous system.",
    ];
    ok(phaseTransitions(sents, 1.0).count >= 1);
  });
});
