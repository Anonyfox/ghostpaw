import type { IncomingMessage } from "node:http";
import {
  countMembers,
  getMember,
  listInteractions,
  listMembers,
  meetMember,
  noteInteraction,
  updateBond,
} from "../../../../core/pack/index.ts";
import type {
  InteractionKind,
  MemberKind,
  MemberStatus,
  PackMember,
} from "../../../../core/pack/types.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { PackInteractionInfo, PackMemberInfo } from "../../shared/pack_types.ts";
import { bondExcerpt, trustLevel } from "../../shared/pack_types.ts";
import { readJsonBody } from "../body_parser.ts";
import type { RouteContext } from "../types.ts";

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

function parseQuery(url: string | undefined): URLSearchParams {
  if (!url) return new URLSearchParams();
  const idx = url.indexOf("?");
  if (idx < 0) return new URLSearchParams();
  return new URLSearchParams(url.slice(idx + 1));
}

async function parseBody(req: IncomingMessage): Promise<Record<string, unknown> | null> {
  try {
    const body = await readJsonBody(req);
    if (typeof body === "object" && body !== null) return body as Record<string, unknown>;
  } catch {
    /* invalid body */
  }
  return null;
}

function toMemberInfo(m: PackMember, interactionCount: number): PackMemberInfo {
  return {
    id: m.id,
    name: m.name,
    kind: m.kind,
    trust: m.trust,
    trustLevel: trustLevel(m.trust),
    status: m.status,
    bondExcerpt: bondExcerpt(m.bond),
    lastContact: m.lastContact,
    interactionCount,
  };
}

export function createPackApiHandlers(db: DatabaseHandle) {
  return {
    list(ctx: RouteContext): void {
      const qs = parseQuery(ctx.req.url);
      const status = (qs.get("status") as MemberStatus) || undefined;
      const kind = (qs.get("kind") as MemberKind) || undefined;
      const limit = Math.min(500, Math.max(1, Number(qs.get("limit")) || 100));

      const summaries = listMembers(db, { status, kind, limit });
      const members: PackMemberInfo[] = summaries.map((s) => ({
        id: s.id,
        name: s.name,
        kind: s.kind,
        trust: s.trust,
        trustLevel: trustLevel(s.trust),
        status: s.status,
        bondExcerpt: bondExcerpt(getMember(db, s.id)?.bond ?? ""),
        lastContact: s.lastContact,
        interactionCount: s.interactionCount,
      }));

      const counts = countMembers(db);
      json(ctx, 200, { members, counts });
    },

    stats(ctx: RouteContext): void {
      const counts = countMembers(db);
      json(ctx, 200, counts);
    },

    detail(ctx: RouteContext): void {
      const id = Number(ctx.params.id);
      if (!Number.isFinite(id) || id < 1) {
        json(ctx, 400, { error: "Invalid member ID." });
        return;
      }
      const member = getMember(db, id);
      if (!member) {
        json(ctx, 404, { error: "Member not found." });
        return;
      }
      const interactions = listInteractions(db, id, { limit: 50 });
      const interactionInfos: PackInteractionInfo[] = interactions.map((i) => ({
        id: i.id,
        kind: i.kind,
        summary: i.summary,
        significance: i.significance,
        createdAt: i.createdAt,
      }));

      json(ctx, 200, {
        id: member.id,
        name: member.name,
        kind: member.kind,
        bond: member.bond,
        trust: member.trust,
        trustLevel: trustLevel(member.trust),
        status: member.status,
        firstContact: member.firstContact,
        lastContact: member.lastContact,
        metadata: member.metadata,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        interactions: interactionInfos,
      });
    },

    async meet(ctx: RouteContext): Promise<void> {
      const body = await parseBody(ctx.req);
      if (!body) {
        json(ctx, 400, { error: "Invalid request body." });
        return;
      }
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        json(ctx, 400, { error: "Name is required." });
        return;
      }
      const kind = typeof body.kind === "string" ? (body.kind as MemberKind) : "human";
      const bond = typeof body.bond === "string" ? body.bond : undefined;
      const metadata = typeof body.metadata === "string" ? body.metadata : undefined;

      try {
        const member = meetMember(db, { name, kind, bond, metadata });
        const count = listInteractions(db, member.id, { limit: 1 }).length;
        json(ctx, 201, toMemberInfo(member, count));
      } catch (err) {
        json(ctx, 400, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    async bond(ctx: RouteContext): Promise<void> {
      const id = Number(ctx.params.id);
      if (!Number.isFinite(id) || id < 1) {
        json(ctx, 400, { error: "Invalid member ID." });
        return;
      }
      const body = await parseBody(ctx.req);
      if (!body) {
        json(ctx, 400, { error: "Invalid request body." });
        return;
      }

      const updates: Record<string, unknown> = {};
      if (typeof body.bond === "string") updates.bond = body.bond;
      if (typeof body.trust === "number") updates.trust = body.trust;
      if (typeof body.status === "string") updates.status = body.status;
      if (typeof body.name === "string") updates.name = body.name;
      if (typeof body.metadata === "string") updates.metadata = body.metadata;

      try {
        const member = updateBond(db, id, updates as Parameters<typeof updateBond>[2]);
        const interactions = listInteractions(db, id, { limit: 50 });
        const interactionInfos: PackInteractionInfo[] = interactions.map((i) => ({
          id: i.id,
          kind: i.kind,
          summary: i.summary,
          significance: i.significance,
          createdAt: i.createdAt,
        }));

        json(ctx, 200, {
          id: member.id,
          name: member.name,
          kind: member.kind,
          bond: member.bond,
          trust: member.trust,
          trustLevel: trustLevel(member.trust),
          status: member.status,
          firstContact: member.firstContact,
          lastContact: member.lastContact,
          metadata: member.metadata,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
          interactions: interactionInfos,
        });
      } catch (err) {
        json(ctx, 400, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    async note(ctx: RouteContext): Promise<void> {
      const id = Number(ctx.params.id);
      if (!Number.isFinite(id) || id < 1) {
        json(ctx, 400, { error: "Invalid member ID." });
        return;
      }
      const body = await parseBody(ctx.req);
      if (!body) {
        json(ctx, 400, { error: "Invalid request body." });
        return;
      }

      const kind = typeof body.kind === "string" ? (body.kind as InteractionKind) : "";
      const summary = typeof body.summary === "string" ? body.summary.trim() : "";
      if (!kind || !summary) {
        json(ctx, 400, { error: "Kind and summary are required." });
        return;
      }

      const significance = typeof body.significance === "number" ? body.significance : 0.5;

      try {
        const interaction = noteInteraction(db, {
          memberId: id,
          kind: kind as InteractionKind,
          summary,
          significance,
        });
        const info: PackInteractionInfo = {
          id: interaction.id,
          kind: interaction.kind,
          summary: interaction.summary,
          significance: interaction.significance,
          createdAt: interaction.createdAt,
        };
        json(ctx, 201, info);
      } catch (err) {
        json(ctx, 400, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    interactions(ctx: RouteContext): void {
      const id = Number(ctx.params.id);
      if (!Number.isFinite(id) || id < 1) {
        json(ctx, 400, { error: "Invalid member ID." });
        return;
      }
      const qs = parseQuery(ctx.req.url);
      const kind = (qs.get("kind") as InteractionKind) || undefined;
      const limit = Math.min(500, Math.max(1, Number(qs.get("limit")) || 50));

      const items = listInteractions(db, id, { kind, limit });
      const infos: PackInteractionInfo[] = items.map((i) => ({
        id: i.id,
        kind: i.kind,
        summary: i.summary,
        significance: i.significance,
        createdAt: i.createdAt,
      }));
      json(ctx, 200, { interactions: infos });
    },
  };
}
