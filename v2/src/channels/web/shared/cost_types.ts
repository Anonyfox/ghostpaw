export type {
  CostByModel,
  CostByPurpose,
  CostBySoul,
  CostSummary,
  DailyCostEntry,
} from "../../../core/chat/index.ts";

export interface CostsLimitInfo {
  maxCostPerDay: number;
  warnAtPercentage: number;
}

export interface CostsResponse {
  today: import("../../../core/chat/index.ts").CostSummary;
  limit: CostsLimitInfo;
  byModel: import("../../../core/chat/index.ts").CostByModel[];
  bySoul: import("../../../core/chat/index.ts").CostBySoul[];
  byPurpose: import("../../../core/chat/index.ts").CostByPurpose[];
  daily: import("../../../core/chat/index.ts").DailyCostEntry[];
}
