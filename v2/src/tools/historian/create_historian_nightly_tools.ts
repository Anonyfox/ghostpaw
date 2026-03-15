import type { Tool } from "chatoyant";
import type { DatabaseHandle } from "../../lib/index.ts";
import { createDatetimeTool } from "../datetime.ts";
import { createRecallTool } from "../memory/recall.ts";
import { createNightlyForecastTools } from "./nightly_forecast_tools.ts";
import { createNightlyWriteTools } from "./nightly_write_tools.ts";

export function createHistorianNightlyTools(db: DatabaseHandle): Tool[] {
  return [
    ...createNightlyWriteTools(db),
    ...createNightlyForecastTools(db),
    createRecallTool(db),
    createDatetimeTool(),
  ];
}
