import { ok } from "node:assert";
import { describe, it } from "node:test";
import type { LevelInfo, SoulDetailResponse, SoulOverviewInfo, TraitInfo } from "./soul_types.ts";

describe("soul shared types", () => {
  it("SoulOverviewInfo is structurally valid", () => {
    const info: SoulOverviewInfo = {
      id: 1,
      name: "Ghostpaw",
      description: "The coordinator soul.",
      level: 2,
      activeTraitCount: 5,
      essencePreview: "The founding coordinator...",
      isMandatory: true,
      updatedAt: Date.now(),
    };
    ok(info.id > 0);
  });

  it("TraitInfo is structurally valid", () => {
    const trait: TraitInfo = {
      id: 1,
      principle: "p",
      provenance: "e",
      generation: 0,
      status: "active",
      mergedInto: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    ok(trait.id > 0);
  });

  it("LevelInfo is structurally valid", () => {
    const level: LevelInfo = {
      id: 1,
      level: 1,
      essenceBefore: "a",
      essenceAfter: "b",
      traitsConsolidated: [],
      traitsPromoted: [],
      traitsCarried: [],
      traitsMerged: [],
      createdAt: Date.now(),
    };
    ok(level.id > 0);
  });

  it("SoulDetailResponse is structurally valid", () => {
    const detail: SoulDetailResponse = {
      id: 1,
      name: "Ghostpaw",
      essence: "Full essence.",
      description: "The coordinator soul.",
      level: 2,
      isMandatory: true,
      deletedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      traits: [],
      levels: [],
    };
    ok(detail.id > 0);
  });
});
