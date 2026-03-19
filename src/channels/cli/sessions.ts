import { defineCommand } from "citty";
import sessionsList from "./sessions_list.ts";
import sessionsPrune from "./sessions_prune.ts";
import sessionsShow from "./sessions_show.ts";

export default defineCommand({
  meta: { name: "sessions", description: "Browse and manage chat sessions" },
  subCommands: {
    list: sessionsList,
    show: sessionsShow,
    prune: sessionsPrune,
  },
});
