import { defineCommand } from "citty";
import skillsCheckpoint from "./skills_checkpoint.ts";
import skillsList from "./skills_list.ts";
import skillsRepair from "./skills_repair.ts";
import skillsShow from "./skills_show.ts";
import skillsStatus from "./skills_status.ts";
import skillsValidate from "./skills_validate.ts";

export default defineCommand({
  meta: { name: "skills", description: "Manage and inspect skills" },
  subCommands: {
    list: skillsList,
    show: skillsShow,
    status: skillsStatus,
    checkpoint: skillsCheckpoint,
    validate: skillsValidate,
    repair: skillsRepair,
  },
});
