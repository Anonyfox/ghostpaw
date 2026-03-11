import { defineCommand } from "citty";
import { previewMergeMember } from "../../core/pack/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

function fmtValue(value: string | number | null): string {
  if (value === null || value === "") return style.dim("none");
  return String(value);
}

export default defineCommand({
  meta: {
    name: "merge-preview",
    description: "Preview merge survivorship and conflicts",
  },
  args: {
    keep: {
      type: "string",
      description: "Survivor member ID",
      required: true,
    },
    merge: {
      type: "string",
      description: "Member ID that would be merged into the survivor",
      required: true,
    },
  },
  async run({ args }) {
    const keepId = Number(args.keep);
    const mergeId = Number(args.merge);
    if (!Number.isInteger(keepId) || keepId < 1 || !Number.isInteger(mergeId) || mergeId < 1) {
      throw new Error("keep and merge must be positive integer IDs.");
    }

    await withRunDb((db) => {
      const preview = previewMergeMember(db, keepId, mergeId);
      console.log(style.dim("── Merge preview ──"));
      console.log(
        `${style.cyan(preview.keepMember.name)} <= ${style.cyan(preview.mergeMember.name)}`,
      );

      console.log();
      console.log(style.dim("Survivorship"));
      for (const choice of preview.memberChoices) {
        if (choice.chosenSource === "same") continue;
        console.log(
          `  ${choice.field}: ${fmtValue(choice.keepValue)} / ${fmtValue(choice.mergeValue)} -> ${fmtValue(choice.chosenValue)} ${style.dim(`(${choice.chosenSource})`)}`,
        );
      }

      console.log();
      console.log(style.dim("Interactions"));
      console.log(
        style.dim(
          `  keep ${preview.interactions.keepCount} / merge ${preview.interactions.mergeCount} / combined ${preview.interactions.combinedCount}`,
        ),
      );

      if (preview.fieldConflicts.length > 0) {
        console.log();
        console.log(style.dim("Field conflicts"));
        for (const field of preview.fieldConflicts) {
          console.log(
            `  ${field.key}: ${fmtValue(field.keepValue)} / ${fmtValue(field.mergeValue)} -> ${fmtValue(field.chosenValue)} ${style.dim(`(${field.chosenSource})`)}`,
          );
        }
      }

      if (preview.linkConflicts.length > 0) {
        console.log();
        console.log(style.dim("Link conflicts"));
        for (const conflict of preview.linkConflicts) {
          console.log(
            `  ${conflict.direction}: ${conflict.label} ${style.dim(`#${conflict.memberId} -> #${conflict.targetId}`)} ${style.dim(`(${conflict.resolution})`)}`,
          );
        }
      }

      if (preview.overlappingContacts.length > 0) {
        console.log();
        console.log(style.dim("Overlapping contacts"));
        for (const contact of preview.overlappingContacts) {
          console.log(`  ${contact.type}: ${contact.value}`);
        }
      }
    });
  },
});
