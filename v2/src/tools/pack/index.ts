import type { Tool } from "chatoyant";
import type { DatabaseHandle } from "../../lib/index.ts";
import { createPackBondTool } from "./bond.ts";
import { createPackMeetTool } from "./meet.ts";
import { createPackNoteTool } from "./note.ts";
import { createPackSenseTool } from "./sense.ts";

export function createPackTools(db: DatabaseHandle): Tool[] {
  return [
    createPackSenseTool(db),
    createPackMeetTool(db),
    createPackBondTool(db),
    createPackNoteTool(db),
  ];
}
