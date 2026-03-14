export type {
  CostByModel,
  CostByPurpose,
  CostBySoul,
  CostSummary,
  DailyCostEntry,
} from "../../../core/chat/api/read/index.ts";

export interface CostsLimitInfo {
  maxCostPerDay: number;
  warnAtPercentage: number;
}

export interface CostsResponse {
  today: import("../../../core/chat/api/read/index.ts").CostSummary;
  limit: CostsLimitInfo;
  byModel: import("../../../core/chat/api/read/index.ts").CostByModel[];
  bySoul: import("../../../core/chat/api/read/index.ts").CostBySoul[];
  byPurpose: import("../../../core/chat/api/read/index.ts").CostByPurpose[];
  daily: import("../../../core/chat/api/read/index.ts").DailyCostEntry[];
}
