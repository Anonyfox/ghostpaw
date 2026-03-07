import { defineCommand } from "citty";
import { listContacts, listInteractions } from "../../core/pack/index.ts";
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

      console.log(style.cyan(`Pack member #${member.id} — ${member.name} (${member.kind})`));
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
          const age = relativeAge(i.createdAt).padStart(6);
          const summary = i.summary.length > 50 ? `${i.summary.slice(0, 49)}…` : i.summary;
          console.log(`  ${style.dim(id)} ${dot} ${style.dim(kind)} ${style.dim(age)}  ${summary}`);
        }
      }
    });
  },
});
