import { defineCommand } from "citty";
import { getTemporalContext, listQuests } from "../../core/quests/api/read/index.ts";
import { style } from "../../lib/terminal/index.ts";
import questsAccept from "./quests_accept.ts";
import questsAdd from "./quests_add.ts";
import questsBoard from "./quests_board.ts";
import questsDismiss from "./quests_dismiss.ts";
import questsDone from "./quests_done.ts";
import questsEmbark from "./quests_embark.ts";
import { formatDate, relativeAge, relativeDue } from "./quests_format.ts";
import questsList from "./quests_list.ts";
import questsOffer from "./quests_offer.ts";
import questsProwl from "./quests_prowl.ts";
import questsSearch from "./quests_search.ts";
import questsShow from "./quests_show.ts";
import questsStorylineAdd from "./quests_storyline_add.ts";
import questsStorylineDone from "./quests_storyline_done.ts";
import questsStorylineList from "./quests_storyline_list.ts";
import questsStorylineShow from "./quests_storyline_show.ts";
import questsStorylineUpdate from "./quests_storyline_update.ts";
import questsTend from "./quests_tend.ts";
import questsUpdate from "./quests_update.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "quests", description: "Manage quests — tasks, events, and recurring commitments" },
  subCommands: {
    list: questsList,
    search: questsSearch,
    show: questsShow,
    add: questsAdd,
    done: questsDone,
    update: questsUpdate,
    board: questsBoard,
    offer: questsOffer,
    accept: questsAccept,
    dismiss: questsDismiss,
    embark: questsEmbark,
    prowl: questsProwl,
    tend: questsTend,
    "storyline-list": questsStorylineList,
    "storyline-add": questsStorylineAdd,
    "storyline-show": questsStorylineShow,
    "storyline-done": questsStorylineDone,
    "storyline-update": questsStorylineUpdate,
  },
  async run() {
    const subs = [
      "list",
      "search",
      "show",
      "add",
      "done",
      "update",
      "board",
      "offer",
      "accept",
      "dismiss",
      "embark",
      "prowl",
      "tend",
      "storyline-list",
      "storyline-add",
      "storyline-show",
      "storyline-done",
      "storyline-update",
    ];
    const positionals = process.argv.slice(2).filter((a) => !a.startsWith("-"));
    if (positionals.length > 1 && subs.includes(positionals[1])) return;

    await withRunDb((db) => {
      const ctx = getTemporalContext(db);
      const boardQuests = listQuests(db, { status: "offered", limit: 100 });

      const total =
        ctx.overdue.length +
        ctx.pendingReminders.length +
        ctx.todayEvents.length +
        ctx.dueSoon.length +
        ctx.activeQuests.length;

      if (total === 0 && boardQuests.length === 0) {
        const allQuests = listQuests(db, { limit: 1 });
        if (allQuests.length === 0) {
          console.log(style.dim('No quests yet. Create one with: ghostpaw quests add "title"'));
        } else {
          console.log(style.dim("All clear — nothing needs attention right now."));
        }
        return;
      }

      const counts: string[] = [];
      if (ctx.overdue.length > 0) counts.push(style.boldRed(`${ctx.overdue.length} overdue`));
      if (ctx.pendingReminders.length > 0)
        counts.push(
          style.yellow(
            `${ctx.pendingReminders.length} reminder${ctx.pendingReminders.length !== 1 ? "s" : ""}`,
          ),
        );
      if (ctx.todayEvents.length > 0) counts.push(style.cyan(`${ctx.todayEvents.length} today`));
      if (ctx.activeQuests.length > 0) counts.push(`${ctx.activeQuests.length} active`);
      if (ctx.dueSoon.length > 0) counts.push(style.dim(`${ctx.dueSoon.length} due soon`));
      if (boardQuests.length > 0) counts.push(style.yellow(`${boardQuests.length} on board`));
      console.log(counts.join(style.dim(" / ")));
      console.log();

      if (ctx.overdue.length > 0) {
        console.log(style.boldRed("── Overdue ──"));
        for (const q of ctx.overdue) {
          const id = `#${q.id}`.padStart(6);
          const due = q.dueAt ? relativeDue(q.dueAt) : "";
          console.log(`  ${style.dim(id)} ${q.title}  ${due}`);
        }
        console.log();
      }

      if (ctx.pendingReminders.length > 0) {
        console.log(style.yellow("── Reminders ──"));
        for (const q of ctx.pendingReminders) {
          const id = `#${q.id}`.padStart(6);
          const remind = q.remindAt ? formatDate(q.remindAt) : "";
          console.log(`  ${style.dim(id)} ${q.title}  ${style.dim(remind)}`);
        }
        console.log();
      }

      if (ctx.todayEvents.length > 0) {
        console.log(style.cyan("── Today ──"));
        for (const q of ctx.todayEvents) {
          const id = `#${q.id}`.padStart(6);
          const time = q.startsAt ? new Date(q.startsAt).toISOString().slice(11, 16) : "";
          console.log(`  ${style.dim(id)} ${time ? `${style.cyan(time)} ` : ""}${q.title}`);
        }
        console.log();
      }

      if (ctx.activeQuests.length > 0) {
        console.log(style.dim("── Active ──"));
        for (const q of ctx.activeQuests) {
          const id = `#${q.id}`.padStart(6);
          const age = relativeAge(q.updatedAt);
          console.log(`  ${style.dim(id)} ${q.title}  ${style.dim(age)}`);
        }
        console.log();
      }

      if (ctx.dueSoon.length > 0) {
        console.log(style.dim("── Due Soon ──"));
        for (const q of ctx.dueSoon) {
          const id = `#${q.id}`.padStart(6);
          const due = q.dueAt ? relativeDue(q.dueAt) : "";
          console.log(`  ${style.dim(id)} ${q.title}  ${style.dim(due)}`);
        }
        console.log();
      }

      if (boardQuests.length > 0) {
        console.log(style.yellow("── Quest Board ──"));
        for (const q of boardQuests.slice(0, 5)) {
          const id = `#${q.id}`.padStart(6);
          const icon = q.createdBy === "ghostpaw" ? style.yellow("!") : style.yellow("?");
          console.log(`  ${style.dim(id)} ${icon} ${q.title}`);
        }
        if (boardQuests.length > 5) {
          console.log(style.dim(`  ... and ${boardQuests.length - 5} more`));
        }
      }
    });
  },
});
