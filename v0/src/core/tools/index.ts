import type { Tool } from "chatoyant";
import { createBashTool } from "./bash.ts";
import { createCalcTool } from "./calc.ts";
import { createDatetimeTool } from "./datetime.ts";
import { createEditTool } from "./edit.ts";
import { createGrepTool } from "./grep.ts";
import { createLsTool } from "./ls.ts";
import { createReadTool } from "./read.ts";
import { createWebFetchTool } from "./web_fetch.ts";
import { createWebSearchTool } from "./web_search/index.ts";
import { createWriteTool } from "./write.ts";

export function createTools(workspace: string): Tool[] {
  return [
    createReadTool(workspace),
    createWriteTool(workspace),
    createEditTool(workspace),
    createLsTool(workspace),
    createGrepTool(workspace),
    createBashTool(workspace),
    createCalcTool(),
    createDatetimeTool(),
    createWebSearchTool(),
    createWebFetchTool(workspace),
  ];
}
