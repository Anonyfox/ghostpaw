import type { Tool } from "chatoyant";
import { createTool, Schema } from "chatoyant";
import {
  compilePreamble,
  resolveOmens,
  updateCalibration,
  writeOmens,
} from "../../core/trail/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

// biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance limitation
type AnySchema = any;

class UpdateCalibrationParams extends Schema {
  entries = Schema.String({
    description: 'JSON array: [{"key":"timing.response_delay","value":2.5}]',
  });
}

class ResolveOmensParams extends Schema {
  resolutions = Schema.String({
    description: 'JSON array: [{"id":1,"outcome":"...","predictionError":0.3}]',
  });
}

class WriteOmensParams extends Schema {
  omens = Schema.String({
    description:
      'JSON array: [{"forecast":"...","confidence":0.7,"horizon_days":7}]. horizon_days is relative days from now (e.g. 7 = one week, 30 = one month).',
  });
}

class CompilePreambleParams extends Schema {
  candidate = Schema.String({ description: "Preamble text candidate (1-3 lines)" });
}

export function createNightlyForecastTools(db: DatabaseHandle): Tool[] {
  return [
    createTool({
      name: "update_calibration",
      description: "Write or update numeric calibration coefficients.",
      parameters: new UpdateCalibrationParams() as AnySchema,
      execute: async ({ args }) => {
        const a = args as Record<string, unknown>;
        return updateCalibration(db, JSON.parse(a.entries as string));
      },
    }),
    createTool({
      name: "resolve_omens",
      description: "Resolve elapsed omens with outcome and prediction error.",
      parameters: new ResolveOmensParams() as AnySchema,
      execute: async ({ args }) => {
        const a = args as Record<string, unknown>;
        return resolveOmens(db, JSON.parse(a.resolutions as string));
      },
    }),
    createTool({
      name: "write_omens",
      description: "Create new forward predictions/forecasts.",
      parameters: new WriteOmensParams() as AnySchema,
      execute: async ({ args }) => {
        const a = args as Record<string, unknown>;
        const raw = JSON.parse(a.omens as string) as Record<string, unknown>[];
        const now = Date.now();
        const omens = raw.map((o) => ({
          forecast: o.forecast as string,
          confidence: o.confidence as number,
          horizon:
            typeof o.horizon_days === "number"
              ? now + (o.horizon_days as number) * 86_400_000
              : (o.horizon as number | undefined),
        }));
        return writeOmens(db, omens);
      },
    }),
    createTool({
      name: "compile_preamble",
      description:
        "Write a new preamble candidate. Returns unchanged if identical to current preamble.",
      parameters: new CompilePreambleParams() as AnySchema,
      execute: async ({ args }) => {
        const a = args as Record<string, unknown>;
        return compilePreamble(db, a.candidate as string);
      },
    }),
  ];
}
