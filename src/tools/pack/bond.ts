import { createTool, Schema } from "chatoyant";
import { MEMBER_STATUSES } from "../../core/pack/api/constants.ts";
import type { MemberStatus, PackMember, UpdateBondInput } from "../../core/pack/api/types.ts";
import { removeField, setField, updateBond } from "../../core/pack/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { resolveMember } from "./resolve.ts";
import { trustLabel } from "./trust_label.ts";

class PackBondParams extends Schema {
  member = Schema.String({
    description: "Name or numeric ID of the member to update.",
  });
  bond = Schema.String({
    optional: true,
    description: "New bond narrative — replaces the entire existing narrative.",
  });
  trust = Schema.Number({
    optional: true,
    description: "New trust level from 0 (stranger) to 1 (absolute trust). Example: 0.85",
  });
  status = Schema.Enum(MEMBER_STATUSES, {
    optional: true,
    description: "New status: 'active', 'dormant', or 'lost'.",
  });
  name = Schema.String({
    optional: true,
    description: "Rename the member.",
  });
  is_user = Schema.Boolean({
    optional: true,
    description:
      "Mark this member as the primary human user. Only one active member can be the user.",
  });
  nickname = Schema.String({
    optional: true,
    description: "Informal short name or alias. Pass empty string to clear.",
  });
  timezone = Schema.String({
    optional: true,
    description: "IANA timezone, e.g. 'Europe/Berlin'. Pass empty string to clear.",
  });
  locale = Schema.String({
    optional: true,
    description: "Locale code, e.g. 'de-DE'. Pass empty string to clear.",
  });
  location = Schema.String({
    optional: true,
    description: "City or region. Pass empty string to clear.",
  });
  address = Schema.String({
    optional: true,
    description: "Full address. Pass empty string to clear.",
  });
  pronouns = Schema.String({
    optional: true,
    description: "Pronouns, e.g. 'she/her'. Pass empty string to clear.",
  });
  birthday = Schema.String({
    optional: true,
    description: "Birthday in ISO format YYYY-MM-DD. Pass empty string to clear.",
  });
  set_field = Schema.String({
    optional: true,
    description:
      "Set one or more tags/fields, comma-separated. " +
      "Tags (no value): 'vip,client'. " +
      "Fields (key=value): 'billing_rate=150/hr EUR'. " +
      "Mixed: 'vip,billing_rate=150/hr EUR,source=conference'.",
  });
  remove_field = Schema.String({
    optional: true,
    description: "Remove one or more tags/fields by key, comma-separated. Example: 'vip,old-tag'.",
  });
}

interface BondArgs {
  member: string;
  bond?: string;
  trust?: number;
  status?: MemberStatus;
  name?: string;
  is_user?: boolean;
  nickname?: string;
  timezone?: string;
  locale?: string;
  location?: string;
  address?: string;
  pronouns?: string;
  birthday?: string;
  set_field?: string;
  remove_field?: string;
}

function collectChanges(
  db: DatabaseHandle,
  resolved: PackMember,
  args: BondArgs,
): { input: UpdateBondInput; changes: string[] } {
  const changes: string[] = [];
  const input: UpdateBondInput = {};

  if (args.bond !== undefined) {
    input.bond = args.bond;
    changes.push("bond updated");
  }
  if (args.trust !== undefined) {
    const clamped = Math.max(0, Math.min(1, args.trust));
    input.trust = clamped;
    changes.push(`trust: ${resolved.trust.toFixed(2)} -> ${clamped.toFixed(2)}`);
  }
  if (args.status !== undefined) {
    input.status = args.status;
    changes.push(`status: ${resolved.status} -> ${args.status}`);
  }
  if (args.name !== undefined) {
    input.name = args.name;
    changes.push(`name: ${resolved.name} -> ${args.name.trim()}`);
  }
  if (args.is_user !== undefined) {
    input.isUser = args.is_user;
    changes.push(`is_user: ${resolved.isUser} -> ${args.is_user}`);
  }
  if (args.nickname !== undefined) {
    input.nickname = args.nickname;
    changes.push("nickname updated");
  }
  if (args.timezone !== undefined) {
    input.timezone = args.timezone;
    changes.push("timezone updated");
  }
  if (args.locale !== undefined) {
    input.locale = args.locale;
    changes.push("locale updated");
  }
  if (args.location !== undefined) {
    input.location = args.location;
    changes.push("location updated");
  }
  if (args.address !== undefined) {
    input.address = args.address;
    changes.push("address updated");
  }
  if (args.pronouns !== undefined) {
    input.pronouns = args.pronouns;
    changes.push("pronouns updated");
  }
  if (args.birthday !== undefined) {
    input.birthday = args.birthday;
    changes.push("birthday updated");
  }

  if (args.set_field) {
    for (const entry of args.set_field
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)) {
      const eqIdx = entry.indexOf("=");
      if (eqIdx > 0) {
        const key = entry.slice(0, eqIdx).trim();
        const val = entry.slice(eqIdx + 1).trim();
        setField(db, resolved.id, key, val);
        changes.push(`field set: ${key}=${val}`);
      } else {
        setField(db, resolved.id, entry);
        changes.push(`tag set: ${entry}`);
      }
    }
  }
  if (args.remove_field) {
    for (const key of args.remove_field
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)) {
      removeField(db, resolved.id, key);
      changes.push(`field removed: ${key}`);
    }
  }

  return { input, changes };
}

export function createPackBondTool(db: DatabaseHandle) {
  return createTool({
    name: "pack_bond",
    description:
      "Update a pack member's profile: bond narrative, trust, status, name, universal fields " +
      "(nickname, timezone, locale, location, address, pronouns, birthday), " +
      "or set/remove custom tags and fields. Pass the member by name or ID. " +
      "Returns a compact confirmation of what changed.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new PackBondParams() as any,
    execute: async ({ args }) => {
      const parsed = args as BondArgs;

      if (!parsed.member || !parsed.member.trim()) {
        return { error: "Member name or ID must not be empty." };
      }

      const resolved = resolveMember(db, parsed.member);
      if (!resolved) {
        return {
          error:
            `Member '${parsed.member.trim()}' not found. ` +
            "Use pack_sense without arguments to see all members.",
        };
      }

      const { input, changes } = collectChanges(db, resolved, parsed);

      if (changes.length === 0) {
        return {
          error:
            "No changes provided. Pass at least one of: bond, trust, status, name, " +
            "is_user, nickname, timezone, locale, location, address, pronouns, birthday, " +
            "set_field, remove_field.",
        };
      }

      try {
        const after = updateBond(db, resolved.id, input);
        return {
          id: after.id,
          name: after.name,
          trust: Math.round(after.trust * 100) / 100,
          trust_level: trustLabel(after.trust),
          status: after.status,
          changes,
        };
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { error: `Failed to update member: ${detail}` };
      }
    },
  });
}
