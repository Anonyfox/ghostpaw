import { defineCommand } from "citty";
import soulsAddTrait from "./souls_add_trait.ts";
import soulsAttune from "./souls_attune.ts";
import soulsAwaken from "./souls_awaken.ts";
import soulsCreate from "./souls_create.ts";
import soulsEdit from "./souls_edit.ts";
import soulsGenerateDescription from "./souls_generate_description.ts";
import soulsGenerateName from "./souls_generate_name.ts";
import soulsLevelUp from "./souls_level_up.ts";
import soulsList from "./souls_list.ts";
import soulsReactivateTrait from "./souls_reactivate_trait.ts";
import soulsRefine from "./souls_refine.ts";
import soulsRetire from "./souls_retire.ts";
import soulsRevertLevelUp from "./souls_revert_level_up.ts";
import soulsRevertTrait from "./souls_revert_trait.ts";
import soulsReview from "./souls_review.ts";
import soulsReviseTrait from "./souls_revise_trait.ts";
import soulsShards from "./souls_shards.ts";
import soulsShow from "./souls_show.ts";

export default defineCommand({
  meta: { name: "souls", description: "Manage and refine souls" },
  subCommands: {
    list: soulsList,
    show: soulsShow,
    create: soulsCreate,
    edit: soulsEdit,
    retire: soulsRetire,
    awaken: soulsAwaken,
    review: soulsReview,
    refine: soulsRefine,
    "level-up": soulsLevelUp,
    "revert-level-up": soulsRevertLevelUp,
    "add-trait": soulsAddTrait,
    "revise-trait": soulsReviseTrait,
    "revert-trait": soulsRevertTrait,
    "reactivate-trait": soulsReactivateTrait,
    shards: soulsShards,
    attune: soulsAttune,
    "generate-description": soulsGenerateDescription,
    "generate-name": soulsGenerateName,
  },
});
