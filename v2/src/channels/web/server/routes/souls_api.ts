import {
  awakenSoul,
  createSoul,
  getLevelHistory,
  getSoul,
  getTraitLimit,
  isMandatorySoulId,
  listDormantSouls,
  listSouls,
  listTraits,
  retireSoul,
  revertLevelUp,
  updateSoul,
} from "../../../../core/souls/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { SoulDetailResponse, SoulOverviewInfo } from "../../shared/soul_types.ts";
import type { RouteContext } from "../types.ts";
import { parseAwakenBody, parseSoulCreateBody, parseSoulUpdateBody } from "./parse_soul_body.ts";

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

function essencePreview(essence: string, maxLen = 120): string {
  if (essence.length <= maxLen) return essence;
  return `${essence.slice(0, maxLen)}...`;
}

export function createSoulsApiHandlers(db: DatabaseHandle, entityAvailable: boolean) {
  return {
    list(ctx: RouteContext): void {
      const summaries = listSouls(db);
      const traitLimit = getTraitLimit(db);
      const souls: SoulOverviewInfo[] = summaries.map((s) => {
        const full = getSoul(db, s.id);
        return {
          id: s.id,
          name: s.name,
          description: s.description,
          level: s.level,
          activeTraitCount: s.activeTraitCount,
          essencePreview: essencePreview(full?.essence ?? ""),
          isMandatory: isMandatorySoulId(s.id),
          updatedAt: s.updatedAt,
        };
      });
      json(ctx, 200, { souls, traitLimit });
    },

    listDormant(ctx: RouteContext): void {
      const summaries = listDormantSouls(db);
      const traitLimit = getTraitLimit(db);
      const souls: SoulOverviewInfo[] = summaries.map((s) => {
        const full = getSoul(db, s.id);
        return {
          id: s.id,
          name: s.name,
          description: s.description,
          level: s.level,
          activeTraitCount: s.activeTraitCount,
          essencePreview: essencePreview(full?.essence ?? ""),
          isMandatory: isMandatorySoulId(s.id),
          updatedAt: s.updatedAt,
        };
      });
      json(ctx, 200, { souls, traitLimit });
    },

    async create(ctx: RouteContext): Promise<void> {
      const result = await parseSoulCreateBody(ctx.req);
      if ("error" in result) {
        json(ctx, 400, { error: result.error });
        return;
      }
      try {
        const soul = createSoul(db, result);
        json(ctx, 201, { soul });
      } catch (err) {
        json(ctx, 400, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    detail(ctx: RouteContext): void {
      const id = Number(ctx.params.id);
      if (!Number.isFinite(id) || id < 1) {
        json(ctx, 400, { error: "Invalid soul ID." });
        return;
      }
      const soul = getSoul(db, id);
      if (!soul) {
        json(ctx, 404, { error: "Soul not found." });
        return;
      }
      const traits = listTraits(db, id);
      const levels = getLevelHistory(db, id);
      const detail: SoulDetailResponse = {
        id: soul.id,
        name: soul.name,
        essence: soul.essence,
        description: soul.description,
        level: soul.level,
        traitLimit: getTraitLimit(db),
        isMandatory: isMandatorySoulId(soul.id),
        deletedAt: soul.deletedAt,
        createdAt: soul.createdAt,
        updatedAt: soul.updatedAt,
        traits: traits.map((t) => ({
          id: t.id,
          principle: t.principle,
          provenance: t.provenance,
          generation: t.generation,
          status: t.status,
          mergedInto: t.mergedInto,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
        levels: levels.map((l) => ({
          id: l.id,
          level: l.level,
          essenceBefore: l.essenceBefore,
          essenceAfter: l.essenceAfter,
          traitsConsolidated: l.traitsConsolidated,
          traitsPromoted: l.traitsPromoted,
          traitsCarried: l.traitsCarried,
          traitsMerged: l.traitsMerged,
          createdAt: l.createdAt,
        })),
        mentorAvailable: entityAvailable,
      };
      json(ctx, 200, detail);
    },

    async update(ctx: RouteContext): Promise<void> {
      const id = Number(ctx.params.id);
      if (!Number.isFinite(id) || id < 1) {
        json(ctx, 400, { error: "Invalid soul ID." });
        return;
      }
      const result = await parseSoulUpdateBody(ctx.req);
      if ("error" in result) {
        json(ctx, 400, { error: result.error });
        return;
      }
      try {
        const soul = updateSoul(db, id, result);
        json(ctx, 200, { soul });
      } catch (err) {
        json(ctx, 400, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    retire(ctx: RouteContext): void {
      const id = Number(ctx.params.id);
      if (!Number.isFinite(id) || id < 1) {
        json(ctx, 400, { error: "Invalid soul ID." });
        return;
      }
      try {
        retireSoul(db, id);
        json(ctx, 200, { ok: true });
      } catch (err) {
        json(ctx, 400, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    async awaken(ctx: RouteContext): Promise<void> {
      const id = Number(ctx.params.id);
      if (!Number.isFinite(id) || id < 1) {
        json(ctx, 400, { error: "Invalid soul ID." });
        return;
      }
      const result = await parseAwakenBody(ctx.req);
      const newName = "newName" in result ? result.newName : undefined;
      try {
        const soul = awakenSoul(db, id, newName);
        json(ctx, 200, { soul });
      } catch (err) {
        json(ctx, 400, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    levels(ctx: RouteContext): void {
      const id = Number(ctx.params.id);
      if (!Number.isFinite(id) || id < 1) {
        json(ctx, 400, { error: "Invalid soul ID." });
        return;
      }
      const levels = getLevelHistory(db, id);
      json(ctx, 200, {
        levels: levels.map((l) => ({
          id: l.id,
          level: l.level,
          essenceBefore: l.essenceBefore,
          essenceAfter: l.essenceAfter,
          traitsConsolidated: l.traitsConsolidated,
          traitsPromoted: l.traitsPromoted,
          traitsCarried: l.traitsCarried,
          traitsMerged: l.traitsMerged,
          createdAt: l.createdAt,
        })),
      });
    },

    revertLevel(ctx: RouteContext): void {
      const id = Number(ctx.params.id);
      if (!Number.isFinite(id) || id < 1) {
        json(ctx, 400, { error: "Invalid soul ID." });
        return;
      }
      try {
        const soul = revertLevelUp(db, id);
        json(ctx, 200, { soul });
      } catch (err) {
        json(ctx, 400, { error: err instanceof Error ? err.message : String(err) });
      }
    },
  };
}
