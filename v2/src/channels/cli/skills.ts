import { defineCommand } from "citty";
import skillsCheckpoint from "./skills_checkpoint.ts";
import skillsCreate from "./skills_create.ts";
import skillsFragments from "./skills_fragments.ts";
import skillsList from "./skills_list.ts";
import skillsRepair from "./skills_repair.ts";
import skillsShow from "./skills_show.ts";
import skillsStatus from "./skills_status.ts";
import skillsStoke from "./skills_stoke.ts";
import skillsTrain from "./skills_train.ts";
import skillsValidate from "./skills_validate.ts";

export default defineCommand({
  meta: { name: "skills", description: "Manage and inspect skills" },
  subCommands: {
    list: skillsList,
    show: skillsShow,
    status: skillsStatus,
    fragments: skillsFragments,
    checkpoint: skillsCheckpoint,
    validate: skillsValidate,
    repair: skillsRepair,
    train: skillsTrain,
    create: skillsCreate,
    stoke: skillsStoke,
  },
});
