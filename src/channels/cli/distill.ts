import { defineCommand } from "citty";
import { defaultChatFactory } from "../../harness/chat_factory.ts";
import { distillPending } from "../../harness/distill_pending.ts";
import { resolveModel } from "../../harness/model.ts";
import { distillSession } from "../../harness/oneshots/distill_session.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "distill", description: "Distill sessions into memories" },
  args: {
    session: {
      type: "string",
      description: "Distill a specific session by ID",
    },
    model: {
      type: "string",
      alias: "m",
      description: "Model override",
    },
    limit: {
      type: "string",
      description: "Maximum sessions to process (default: 50)",
    },
  },
  async run({ args }) {
    await withRunDb(async (db) => {
      const model = resolveModel(db, args.model as string | undefined);

      if (args.session) {
        const id = Number.parseInt(args.session as string, 10);
        if (!Number.isInteger(id) || id <= 0) {
          console.error(
            style.boldRed("error".padStart(10)),
            " Session ID must be a positive integer.",
          );
          process.exitCode = 1;
          return;
        }

        console.log(style.dim(`distilling session #${id}...`));
        const result = await distillSession(db, id, model, defaultChatFactory);

        if (result.skipped) {
          console.log(style.dim(`skipped: ${result.reason}`));
        } else {
          const tc = result.toolCalls;
          console.log(
            style.cyan("distilled"),
            style.dim(
              `recall=${tc.recall} remember=${tc.remember} revise=${tc.revise} forget=${tc.forget}`,
            ),
          );
        }
        return;
      }

      const maxSessions = args.limit ? Number.parseInt(args.limit as string, 10) : undefined;

      console.log(style.dim("scanning for undistilled sessions..."));
      const result = await distillPending(db, defaultChatFactory, model, { maxSessions });

      if (result.sessionsProcessed === 0 && result.sessionsSkipped === 0) {
        console.log(style.dim("no sessions to distill"));
        return;
      }

      const tc = result.totalToolCalls;
      console.log(
        style.cyan("done"),
        `${result.sessionsProcessed} distilled, ${result.sessionsSkipped} skipped`,
      );
      if (result.sessionsProcessed > 0) {
        console.log(
          style.dim(
            `  recall=${tc.recall ?? 0} remember=${tc.remember ?? 0} revise=${tc.revise ?? 0} forget=${tc.forget ?? 0}`,
          ),
        );
      }
    });
  },
});
