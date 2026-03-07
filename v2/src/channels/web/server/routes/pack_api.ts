import type { IncomingMessage } from "node:http";
import {
  addContact,
  countMembers,
  getMember,
  listContacts,
  listInteractions,
  listMembers,
  lookupContact,
  meetMember,
  mergeMember,
  noteInteraction,
  removeContact,
  updateBond,
} from "../../../../core/pack/index.ts";
import type {
  ContactType,
  InteractionKind,
  MemberKind,
  MemberStatus,
  PackMember,
} from "../../../../core/pack/types.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type {
  PackContactInfo,
  PackInteractionInfo,
  PackMemberInfo,
} from "../../shared/pack_types.ts";
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

function toContactInfo(c: {
  id: number;
  type: string;
  value: string;
  label: string | null;
}): PackContactInfo {
  return { id: c.id, type: c.type as ContactType, value: c.value, label: c.label };
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
      const contacts = listContacts(db, id);
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
        isUser: member.isUser,
        firstContact: member.firstContact,
        lastContact: member.lastContact,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        contacts: contacts.map(toContactInfo),
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
      const isUser = typeof body.isUser === "boolean" ? body.isUser : false;

      try {
        const member = meetMember(db, { name, kind, bond, isUser });
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
      if (typeof body.isUser === "boolean") updates.isUser = body.isUser;

      try {
        const member = updateBond(db, id, updates as Parameters<typeof updateBond>[2]);
        const interactions = listInteractions(db, id, { limit: 50 });
        const contacts = listContacts(db, id);
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
          isUser: member.isUser,
          firstContact: member.firstContact,
          lastContact: member.lastContact,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
          contacts: contacts.map(toContactInfo),
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

    contacts(ctx: RouteContext): void {
      const id = Number(ctx.params.id);
      if (!Number.isFinite(id) || id < 1) {
        json(ctx, 400, { error: "Invalid member ID." });
        return;
      }
      const contacts = listContacts(db, id);
      json(ctx, 200, { contacts: contacts.map(toContactInfo) });
    },

    async addContact(ctx: RouteContext): Promise<void> {
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

      const type = typeof body.type === "string" ? (body.type as ContactType) : "";
      const value = typeof body.value === "string" ? body.value.trim() : "";
      if (!type || !value) {
        json(ctx, 400, { error: "Type and value are required." });
        return;
      }
      const label = typeof body.label === "string" ? body.label : undefined;

      try {
        const result = addContact(db, { memberId: id, type, value, label });
        if (result.conflict) {
          json(ctx, 409, {
            conflict: true,
            existingMemberId: result.conflict.existingMemberId,
            message: `Contact ${type}:${value} already belongs to member #${result.conflict.existingMemberId}.`,
          });
          return;
        }
        json(ctx, 201, toContactInfo(result.contact));
      } catch (err) {
        json(ctx, 400, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    removeContact(ctx: RouteContext): void {
      const contactId = Number(ctx.params.contactId);
      if (!Number.isFinite(contactId) || contactId < 1) {
        json(ctx, 400, { error: "Invalid contact ID." });
        return;
      }
      try {
        removeContact(db, contactId);
        json(ctx, 200, { removed: true });
      } catch (err) {
        json(ctx, 404, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    lookupContact(ctx: RouteContext): void {
      const type = ctx.params.type as ContactType;
      const value = decodeURIComponent(ctx.params.value || "");
      if (!type || !value) {
        json(ctx, 400, { error: "Type and value are required." });
        return;
      }
      try {
        const member = lookupContact(db, type, value);
        if (!member) {
          json(ctx, 404, { found: false });
          return;
        }
        json(ctx, 200, { found: true, member: toMemberInfo(member, 0) });
      } catch (err) {
        json(ctx, 400, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    async merge(ctx: RouteContext): Promise<void> {
      const body = await parseBody(ctx.req);
      if (!body) {
        json(ctx, 400, { error: "Invalid request body." });
        return;
      }
      const keepId = typeof body.keepId === "number" ? body.keepId : 0;
      const mergeId = typeof body.mergeId === "number" ? body.mergeId : 0;
      if (keepId < 1 || mergeId < 1) {
        json(ctx, 400, { error: "keepId and mergeId are required." });
        return;
      }
      try {
        const result = mergeMember(db, keepId, mergeId);
        json(ctx, 200, {
          merged: true,
          kept: { id: result.id, name: result.name },
          lost: { id: mergeId },
        });
      } catch (err) {
        json(ctx, 400, { error: err instanceof Error ? err.message : String(err) });
      }
    },
  };
}
