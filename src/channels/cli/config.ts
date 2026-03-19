import { defineCommand } from "citty";
import configGet from "./config_get_cmd.ts";
import configList from "./config_list_cmd.ts";
import configReset from "./config_reset_cmd.ts";
import configSet from "./config_set_cmd.ts";
import configUndo from "./config_undo_cmd.ts";

export default defineCommand({
  meta: { name: "config", description: "Manage configuration" },
  subCommands: {
    set: configSet,
    get: configGet,
    list: configList,
    reset: configReset,
    undo: configUndo,
  },
});
