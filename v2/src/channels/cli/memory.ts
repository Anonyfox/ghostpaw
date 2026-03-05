import { defineCommand } from "citty";
import memoryAdd from "./memory_add.ts";
import memoryConfirm from "./memory_confirm.ts";
import memoryCorrect from "./memory_correct.ts";
import memoryForget from "./memory_forget.ts";
import memoryList from "./memory_list.ts";
import memoryMerge from "./memory_merge.ts";
import memorySearch from "./memory_search.ts";
import memoryShow from "./memory_show.ts";

export default defineCommand({
  meta: { name: "memory", description: "Browse and manage memories" },
  subCommands: {
    list: memoryList,
    search: memorySearch,
    show: memoryShow,
    add: memoryAdd,
    confirm: memoryConfirm,
    forget: memoryForget,
    correct: memoryCorrect,
    merge: memoryMerge,
  },
});
