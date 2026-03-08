import type { Tool } from "chatoyant";
import type { DatabaseHandle } from "../../lib/index.ts";
import { createPackBondTool } from "./bond.ts";
import { createContactAddTool } from "./contact_add.ts";
import { createContactListTool } from "./contact_list.ts";
import { createContactLookupTool } from "./contact_lookup.ts";
import { createContactRemoveTool } from "./contact_remove.ts";
import { createPackLinkTool } from "./link.ts";
import { createPackMeetTool } from "./meet.ts";
import { createPackMergeTool } from "./merge.ts";
import { createPackNoteTool } from "./note.ts";
import { createPackSenseTool } from "./sense.ts";

export function createPackTools(db: DatabaseHandle): Tool[] {
  return [
    createPackSenseTool(db),
    createPackMeetTool(db),
    createPackBondTool(db),
    createPackNoteTool(db),
    createPackLinkTool(db),
    createContactAddTool(db),
    createContactRemoveTool(db),
    createContactListTool(db),
    createContactLookupTool(db),
    createPackMergeTool(db),
  ];
}
