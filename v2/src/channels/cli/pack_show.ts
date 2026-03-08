import { defineCommand } from "citty";
import {
  getMember,
  listContacts,
  listFields,
  listInteractions,
  listLinks,
} from "../../core/pack/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { resolveMember } from "./resolve_member.ts";
import { withRunDb } from "./with_run_db.ts";

function trustLabel(trust: number): string {
  if (trust >= 0.7) return "strong";
  if (trust >= 0.4) return "moderate";
  return "low";
}

function formatDate(ts: number): string {
  return new Date(ts).toISOString().replace("T", " ").slice(0, 19);
}

function relativeAge(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function kindDot(kind: string): string {
  const map: Record<string, (s: string) => string> = {
    conversation: style.green,
    correction: style.yellow,
    conflict: style.red,
    gift: style.cyan,
    milestone: style.boldCyan,
    observation: style.dim,
    transaction: style.yellow,
    activity: style.green,
  };
  return (map[kind] ?? style.dim)("●");
}

export default defineCommand({
  meta: { name: "show", description: "Show full details for a pack member" },
  args: {
    member: {
      type: "positional",
      description: "Member ID (number) or name (string)",
      required: true,
    },
  },
  async run({ args }) {
    const ref = (args._ ?? [])[0] || (args.member as string);
    if (!ref?.trim()) {
      console.error(style.boldRed("error".padStart(10)), " Member ID or name is required.");
      process.exitCode = 1;
      return;
    }

    await withRunDb((db) => {
      const member = resolveMember(db, ref);
      if (!member) {
        console.error(style.boldRed("error".padStart(10)), ` Member "${ref}" not found.`);
        process.exitCode = 1;
        return;
      }

      const displayName = member.nickname ? `${member.name} "${member.nickname}"` : member.name;
      console.log(style.cyan(`Pack member #${member.id} — ${displayName} (${member.kind})`));
      if (member.isUser) {
        console.log(style.boldCyan("  [primary user]"));
      }
      console.log();

      if (member.bond) {
        console.log(member.bond);
        console.log();
      }

      console.log(style.dim("── Details ──"));
      console.log(
        `${style.dim("trust".padStart(12))}  ${member.trust.toFixed(2)} (${trustLabel(member.trust)})`,
      );
      console.log(`${style.dim("status".padStart(12))}  ${member.status}`);
      console.log(`${style.dim("kind".padStart(12))}  ${member.kind}`);
      console.log(
        `${style.dim("contact".padStart(12))}  first ${relativeAge(member.firstContact)} / last ${relativeAge(member.lastContact)}`,
      );
      console.log(
        `${style.dim("created".padStart(12))}  ${formatDate(member.createdAt)} (${relativeAge(member.createdAt)})`,
      );

      if (member.parentId) {
        const parent = getMember(db, member.parentId);
        if (parent) {
          console.log(`${style.dim("parent".padStart(12))}  ${parent.name} (#${parent.id})`);
        }
      }
      if (member.timezone) console.log(`${style.dim("timezone".padStart(12))}  ${member.timezone}`);
      if (member.locale) console.log(`${style.dim("locale".padStart(12))}  ${member.locale}`);
      if (member.location) console.log(`${style.dim("location".padStart(12))}  ${member.location}`);
      if (member.address) console.log(`${style.dim("address".padStart(12))}  ${member.address}`);
      if (member.pronouns) console.log(`${style.dim("pronouns".padStart(12))}  ${member.pronouns}`);
      if (member.birthday) console.log(`${style.dim("birthday".padStart(12))}  ${member.birthday}`);

      const fields = listFields(db, member.id);
      const tags = fields.filter((f) => f.value === null).map((f) => f.key);
      const dataFields = fields.filter((f) => f.value !== null);

      if (tags.length > 0) {
        console.log();
        console.log(style.dim("── Tags ──"));
        console.log(`  ${tags.join(", ")}`);
      }

      if (dataFields.length > 0) {
        console.log();
        console.log(style.dim("── Fields ──"));
        for (const f of dataFields) {
          console.log(`${style.dim(f.key.padStart(16))}  ${f.value}`);
        }
      }

      const links = listLinks(db, member.id);
      if (links.length > 0) {
        console.log();
        console.log(style.dim(`── Links (${links.length}) ──`));
        for (const l of links) {
          const target = getMember(db, l.targetId);
          const targetName = target?.name ?? `#${l.targetId}`;
          const parts = [`${l.label} → ${targetName}`];
          if (l.role) parts.push(style.dim(`(${l.role})`));
          if (!l.active) parts.push(style.dim("[former]"));
          console.log(`  ${parts.join(" ")}`);
        }
      }

      const contacts = listContacts(db, member.id);
      if (contacts.length > 0) {
        console.log();
        console.log(style.dim(`── Contacts (${contacts.length}) ──`));
        for (const c of contacts) {
          const label = c.label ? ` ${style.dim(`(${c.label})`)}` : "";
          console.log(`  ${style.dim(c.type.padEnd(12))} ${c.value}${label}`);
        }
      }

      const interactions = listInteractions(db, member.id, { limit: 10 });
      if (interactions.length > 0) {
        console.log();
        console.log(style.dim(`── Recent interactions (${interactions.length}) ──`));
        for (const i of interactions) {
          const id = `#${i.id}`.padStart(6);
          const dot = kindDot(i.kind);
          const kind = i.kind.padEnd(14);
          const dateLabel =
            i.occurredAt !== null && i.occurredAt !== i.createdAt
              ? new Date(i.occurredAt).toISOString().slice(0, 10)
              : relativeAge(i.createdAt);
          const age = dateLabel.padStart(10);
          const summary = i.summary.length > 50 ? `${i.summary.slice(0, 49)}…` : i.summary;
          console.log(`  ${style.dim(id)} ${dot} ${style.dim(kind)} ${style.dim(age)}  ${summary}`);
        }
      }
    });
  },
});
