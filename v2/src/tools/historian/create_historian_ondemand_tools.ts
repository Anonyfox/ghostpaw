import type { Tool } from "chatoyant";
import { createTool, Schema } from "chatoyant";
import {
  getAllCalibration,
  getCalibrationByDomain,
  getCalibrationByKey,
  getTrailState,
  listChronicleEntries,
  listOmens,
  listOpenLoops,
  listPairingWisdom,
} from "../../core/trail/api/read/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class TrailStateParams extends Schema {}

class ListWisdomParams extends Schema {
  category = Schema.String({
    description:
      "Filter by category: tone, framing, timing, initiative, workflow, boundaries, other",
    optional: true,
  });
  min_confidence = Schema.Number({
    description: "Minimum confidence threshold (0-1)",
    optional: true,
  });
}

class ListLoopsParams extends Schema {
  status = Schema.String({
    description: "Filter by status: alive, dormant, resolved, dismissed",
    optional: true,
  });
  limit = Schema.Integer({ description: "Max results (default 7)", optional: true });
}

class GetCalibrationParams extends Schema {
  key = Schema.String({ description: "Specific calibration key", optional: true });
  domain = Schema.String({ description: "Domain prefix to filter by", optional: true });
}

class ListOmensParams extends Schema {
  include_resolved = Schema.Boolean({
    description: "Include resolved omens (default false)",
    optional: true,
  });
}

class ListChronicleParams extends Schema {
  limit = Schema.Integer({ description: "Max entries (default 5)", optional: true });
}

// biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance limitation
type AnySchema = any;

export function createHistorianOndemandTools(db: DatabaseHandle): Tool[] {
  return [
    createTool({
      name: "get_trail_state",
      description: "Read current chapter, momentum, and recent trailmarks.",
      parameters: new TrailStateParams() as AnySchema,
      execute: async () => getTrailState(db),
    }),
    createTool({
      name: "list_pairing_wisdom",
      description: "Read pairing wisdom entries, optionally filtered by category or confidence.",
      parameters: new ListWisdomParams() as AnySchema,
      execute: async ({ args }) => {
        const a = args as Record<string, unknown>;
        return listPairingWisdom(db, {
          category: a.category as
            | "tone"
            | "framing"
            | "timing"
            | "initiative"
            | "workflow"
            | "boundaries"
            | "other"
            | undefined,
          minConfidence: a.min_confidence as number | undefined,
        });
      },
    }),
    createTool({
      name: "list_open_loops",
      description: "Read active open loops ordered by significance.",
      parameters: new ListLoopsParams() as AnySchema,
      execute: async ({ args }) => {
        const a = args as Record<string, unknown>;
        return listOpenLoops(db, {
          status: a.status as "alive" | "dormant" | undefined,
          limit: a.limit as number | undefined,
        });
      },
    }),
    createTool({
      name: "get_calibration",
      description: "Read calibration coefficients by key, domain, or all.",
      parameters: new GetCalibrationParams() as AnySchema,
      execute: async ({ args }) => {
        const a = args as Record<string, unknown>;
        if (a.key) return getCalibrationByKey(db, a.key as string);
        if (a.domain) return getCalibrationByDomain(db, a.domain as string);
        return getAllCalibration(db);
      },
    }),
    createTool({
      name: "list_omens",
      description: "Read active predictions/forecasts.",
      parameters: new ListOmensParams() as AnySchema,
      execute: async ({ args }) => {
        const a = args as Record<string, unknown>;
        return listOmens(db, { includeResolved: a.include_resolved as boolean | undefined });
      },
    }),
    createTool({
      name: "list_chronicle",
      description: "Read recent chronicle entries.",
      parameters: new ListChronicleParams() as AnySchema,
      execute: async ({ args }) => {
        const a = args as Record<string, unknown>;
        return listChronicleEntries(db, { limit: (a.limit as number) ?? 5 });
      },
    }),
  ];
}
