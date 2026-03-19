import { defineCommand } from "citty";
import { countMembers, sensePack } from "../../core/pack/api/read/index.ts";
import { defaultChatFactory } from "../../harness/chat_factory.ts";
import { resolveModel } from "../../harness/model.ts";
import { executeCommand } from "../../harness/oneshots/execute_command.ts";
import { style } from "../../lib/terminal/index.ts";
import packCount from "./pack_count.ts";
import packHistory from "./pack_history.ts";
import packList from "./pack_list.ts";
import packMergePreview from "./pack_merge_preview.ts";
import packPatrol from "./pack_patrol.ts";
import packShow from "./pack_show.ts";
import { withRunDb } from "./with_run_db.ts";

const PACK_SUBCOMMANDS = ["list", "merge-preview", "show", "history", "count", "patrol"] as const;
type PackSubcommand = (typeof PACK_SUBCOMMANDS)[number];

interface ParsedPackInvocation {
  model?: string;
  options: Record<string, string | boolean>;
  positionals: string[];
}

function optionString(options: Record<string, string | boolean>, key: string): string | undefined {
  const value = options[key];
  return typeof value === "string" ? value : undefined;
}

function parsePackInvocation(argv: string[]): ParsedPackInvocation {
  const packIndex = argv.indexOf("pack");
  const tokens = packIndex >= 0 ? argv.slice(packIndex + 1) : [];
  const options: Record<string, string | boolean> = {};
  const positionals: string[] = [];
  let model: string | undefined;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "-m" || token === "--model") {
      model = tokens[index + 1];
      index += 1;
      continue;
    }
    if (token.startsWith("--")) {
      const [rawKey, inlineValue] = token.slice(2).split("=", 2);
      if (inlineValue !== undefined) {
        options[rawKey] = inlineValue;
        continue;
      }
      const next = tokens[index + 1];
      if (next && !next.startsWith("-")) {
        options[rawKey] = next;
        index += 1;
      } else {
        options[rawKey] = true;
      }
      continue;
    }
    if (!token.startsWith("-")) {
      positionals.push(token);
    }
  }

  return { model, options, positionals };
}

async function runSubcommand(
  subcommand: PackSubcommand,
  parsed: ParsedPackInvocation,
): Promise<void> {
  const positionals = parsed.positionals.slice(1);

  if (subcommand === "list") {
    await packList.run?.({
      args: {
        status: optionString(parsed.options, "status"),
        kind: optionString(parsed.options, "kind"),
        field: optionString(parsed.options, "field"),
        group: optionString(parsed.options, "group"),
        search: optionString(parsed.options, "search"),
        limit: optionString(parsed.options, "limit"),
        model: parsed.model,
        _: positionals,
      },
    } as never);
    return;
  }

  if (subcommand === "merge-preview") {
    await packMergePreview.run?.({
      args: {
        keep: optionString(parsed.options, "keep") ?? positionals[0],
        merge: optionString(parsed.options, "merge") ?? positionals[1],
        _: positionals,
      },
    } as never);
    return;
  }

  if (subcommand === "show") {
    await packShow.run?.({
      args: {
        member: positionals[0],
        _: positionals,
      },
    } as never);
    return;
  }

  if (subcommand === "history") {
    await packHistory.run?.({
      args: {
        member: positionals[0],
        kind: optionString(parsed.options, "kind"),
        limit: optionString(parsed.options, "limit"),
        _: positionals,
      },
    } as never);
    return;
  }

  if (subcommand === "count") {
    await packCount.run?.({ args: { _: [] } } as never);
    return;
  }

  await packPatrol.run?.({
    args: {
      days: optionString(parsed.options, "days"),
      _: positionals,
    },
  } as never);
}

function trustDot(trust: number): string {
  if (trust >= 0.7) return style.green("●");
  if (trust >= 0.4) return style.yellow("●");
  return style.dim("●");
}

function relativeAge(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function showOverview(db: import("../../lib/index.ts").DatabaseHandle): void {
  const counts = countMembers(db);
  const members = sensePack(db);

  console.log(
    style.dim(
      `${counts.active} active / ${counts.dormant} dormant / ${counts.lost} lost / ${counts.total} total`,
    ),
  );

  if (members.length === 0) {
    console.log(style.dim("The pack is empty."));
    return;
  }

  const header = `${"ID".padStart(5)}    ${"Name".padEnd(20)} ${"Kind".padEnd(10)} ${"Trust".padStart(5)} ${"Status".padEnd(8)} ${"Last".padStart(5)} ${"Int".padStart(4)}`;
  console.log(style.dim(header));
  console.log(style.dim("─".repeat(68)));

  for (const m of members) {
    const id = String(m.id).padStart(5);
    const dot = trustDot(m.trust);
    const label = m.nickname ? `${m.name} "${m.nickname}"` : m.name;
    const name = label.length > 18 ? `${label.slice(0, 17)}…` : label.padEnd(18);
    const kind = m.kind.padEnd(10);
    const trust = m.trust.toFixed(2).padStart(5);
    const status = m.status.padEnd(8);
    const last = relativeAge(m.lastContact).padStart(5);
    const interactions = String(m.interactionCount).padStart(4);
    console.log(
      `${style.dim(id)} ${dot} ${style.cyan(name)} ${style.dim(kind)} ${trust} ${style.dim(status)} ${style.dim(last)} ${style.dim(interactions)}`,
    );
  }
}

export default defineCommand({
  meta: {
    name: "pack",
    description:
      'Manage ghostpaw\'s pack (social world). Usage: pack [subcommand] or pack "instruction" or pack <id> "instruction"',
  },
  args: {
    model: {
      type: "string",
      alias: "m",
      description: "Model override for commands",
    },
  },
  async run({ args }) {
    const parsed = parsePackInvocation(process.argv.slice(2));
    const rawSubcommand = parsed.positionals[0];
    if (rawSubcommand && PACK_SUBCOMMANDS.includes(rawSubcommand as PackSubcommand)) {
      await runSubcommand(rawSubcommand as PackSubcommand, parsed);
      return;
    }

    const positionals = (args._ ?? []) as string[];

    if (positionals.length === 0) {
      await withRunDb((db) => showOverview(db));
      return;
    }

    let memberId: number | undefined;
    let textParts: string[];
    const first = positionals[0];

    if (/^\d+$/.test(first) && positionals.length > 1) {
      memberId = Number(first);
      textParts = positionals.slice(1);
    } else {
      textParts = positionals;
    }

    const text = textParts.join(" ");
    if (!text.trim()) {
      await withRunDb((db) => showOverview(db));
      return;
    }

    await withRunDb(async (db) => {
      const model = resolveModel(db, args.model as string | undefined);
      console.log(style.dim("processing..."));

      const result = await executeCommand(db, model, defaultChatFactory, {
        text,
        channel: "cli",
        memberId,
      });

      if (result.acted) {
        console.log(style.cyan("done".padStart(10)), ` ${result.response}`);
      } else {
        console.log(style.yellow("info".padStart(10)), ` ${result.response}`);
      }
      console.log(style.dim(`  $${result.cost.toFixed(4)} (session #${result.sessionId})`));
    });
  },
});
