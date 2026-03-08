import type { IncomingMessage } from "node:http";
import {
  countMembers,
  getMemberBonds,
  getMemberName,
  getMemberTags,
  listContacts,
  listInteractions,
  listMembers,
  packDigest,
  resolveNames,
  senseMember,
} from "../../../../core/pack/index.ts";
import type {
  ContactType,
  InteractionKind,
  MemberKind,
  MemberStatus,
} from "../../../../core/pack/types.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type {
  PackContactInfo,
  PackFieldInfo,
  PackInteractionInfo,
  PackLinkInfo,
  PackMemberInfo,
} from "../../shared/pack_types.ts";
import { trustLevel } from "../../shared/pack_types.ts";
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

function bondExcerpt(bond: string, maxLen = 120): string {
  return bond.length <= maxLen ? bond : `${bond.slice(0, maxLen)}...`;
}

export function createPackApiHandlers(db: DatabaseHandle) {
  return {
    list(ctx: RouteContext): void {
      const qs = parseQuery(ctx.req.url);
      const status = (qs.get("status") as MemberStatus) || undefined;
      const kind = (qs.get("kind") as MemberKind) || undefined;
      const limit = Math.min(500, Math.max(1, Number(qs.get("limit")) || 100));

      const summaries = listMembers(db, { status, kind, limit });
      const memberIds = summaries.map((s) => s.id);

      const bondMap = getMemberBonds(db, memberIds);
      const tagsByMember = getMemberTags(db, memberIds);

      const members: PackMemberInfo[] = summaries.map((s) => ({
        id: s.id,
        name: s.name,
        nickname: s.nickname,
        kind: s.kind,
        trust: s.trust,
        trustLevel: trustLevel(s.trust),
        status: s.status,
        bondExcerpt: bondExcerpt(bondMap.get(s.id) ?? ""),
        lastContact: s.lastContact,
        interactionCount: s.interactionCount,
        tags: tagsByMember.get(s.id) ?? [],
      }));

      const counts = countMembers(db);
      json(ctx, 200, { members, counts });
    },

    stats(ctx: RouteContext): void {
      const counts = countMembers(db);
      json(ctx, 200, counts);
    },

    patrol(ctx: RouteContext): void {
      const qs = parseQuery(ctx.req.url);
      const days = Math.min(90, Math.max(1, Number(qs.get("days")) || 14));
      const digest = packDigest(db, days);
      json(ctx, 200, {
        drift: digest.drift,
        landmarks: digest.landmarks,
        stats: digest.stats,
        generatedAt: digest.generatedAt,
      });
    },

    detail(ctx: RouteContext): void {
      const id = Number(ctx.params.id);
      if (!Number.isFinite(id) || id < 1) {
        json(ctx, 400, { error: "Invalid member ID." });
        return;
      }
      const detail = senseMember(db, id, 50);
      if (!detail) {
        json(ctx, 404, { error: "Member not found." });
        return;
      }

      const { member } = detail;

      const parentName = member.parentId ? getMemberName(db, member.parentId) : null;

      const interactionInfos: PackInteractionInfo[] = detail.interactions.map((i) => ({
        id: i.id,
        kind: i.kind,
        summary: i.summary,
        significance: i.significance,
        occurredAt: i.occurredAt,
        createdAt: i.createdAt,
      }));

      const fieldInfos: PackFieldInfo[] = detail.fields.map((f) => ({
        key: f.key,
        value: f.value,
      }));

      const targetIds = [...new Set(detail.links.map((l) => l.targetId))];
      const nameMap = resolveNames(db, targetIds);

      const linkInfos: PackLinkInfo[] = detail.links.map((l) => ({
        id: l.id,
        targetId: l.targetId,
        targetName: nameMap.get(l.targetId) ?? `#${l.targetId}`,
        label: l.label,
        role: l.role,
        active: l.active,
      }));

      const contactInfos: PackContactInfo[] = detail.contacts.map((c) => ({
        id: c.id,
        type: c.type as ContactType,
        value: c.value,
        label: c.label,
      }));

      json(ctx, 200, {
        id: member.id,
        name: member.name,
        nickname: member.nickname,
        kind: member.kind,
        bond: member.bond,
        trust: member.trust,
        trustLevel: trustLevel(member.trust),
        status: member.status,
        isUser: member.isUser,
        parentId: member.parentId,
        parentName,
        timezone: member.timezone,
        locale: member.locale,
        location: member.location,
        address: member.address,
        pronouns: member.pronouns,
        birthday: member.birthday,
        firstContact: member.firstContact,
        lastContact: member.lastContact,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        fields: fieldInfos,
        links: linkInfos,
        contacts: contactInfos,
        interactions: interactionInfos,
      });
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
        occurredAt: i.occurredAt,
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
      json(ctx, 200, {
        contacts: contacts.map((c) => ({
          id: c.id,
          type: c.type as ContactType,
          value: c.value,
          label: c.label,
        })),
      });
    },

    async command(ctx: RouteContext): Promise<void> {
      const body = await parseBody(ctx.req);
      if (!body) {
        json(ctx, 400, { error: "Invalid request body." });
        return;
      }
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text) {
        json(ctx, 400, { error: "text is required." });
        return;
      }
      const memberId =
        typeof body.memberId === "number" && body.memberId > 0 ? body.memberId : undefined;

      try {
        const { executeCommand } = await import("../../../../harness/oneshots/execute_command.ts");
        const { resolveModel } = await import("../../../../harness/model.ts");
        const { defaultChatFactory } = await import("../../../../harness/chat_factory.ts");

        const model = resolveModel(db);
        const createChat = defaultChatFactory;

        const result = await executeCommand(db, model, createChat, {
          text,
          channel: "web",
          memberId,
        });

        json(ctx, 200, {
          response: result.response,
          cost: result.cost,
          sessionId: result.sessionId,
          acted: result.acted,
        });
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },
  };
}
