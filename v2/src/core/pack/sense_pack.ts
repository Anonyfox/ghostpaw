import type { DatabaseHandle } from "../../lib/index.ts";
import { listMembers } from "./list_members.ts";
import type { PackMemberSummary } from "./types.ts";

export function sensePack(db: DatabaseHandle): PackMemberSummary[] {
  return listMembers(db, { status: ["active", "dormant"] });
}
