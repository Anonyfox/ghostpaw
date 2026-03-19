import { createTool, Schema } from "chatoyant";
import type { PreviousReading } from "../lib/index.ts";
import { senseState } from "../lib/index.ts";

class SenseParams extends Schema {
  text = Schema.String({
    description: "Text to measure — typically your last response or a section of it.",
  });
  previous = Schema.String({
    description: "Previous sense result as JSON, for detecting changes. Omit on first call.",
    optional: true,
  });
}

export function createSenseTool() {
  return createTool({
    name: "sense",
    description:
      "Measure your own text for quality signals. Returns status ('ok' or 'attention') " +
      "and structural metrics (compression ratio, confidence, momentum, semantic distance). " +
      "Use to detect premature convergence, shallow analysis, or structural issues in your " +
      "response. When status is 'attention', read the intervention field for guidance. " +
      "Pass the previous result as the 'previous' parameter to track changes over time.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new SenseParams() as any,
    execute: async ({ args }) => {
      const { text, previous: previousJson } = args as {
        text: string;
        previous?: string;
      };

      if (!text || !text.trim()) {
        return { error: "Text must not be empty." };
      }

      let previous: PreviousReading | undefined;
      if (previousJson) {
        try {
          const parsed = JSON.parse(previousJson);
          if (parsed.metrics && typeof parsed.metrics === "object") {
            previous = { metrics: parsed.metrics, textInfo: parsed.textInfo };
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return { error: `Invalid JSON in 'previous' parameter: ${msg}` };
        }
      }

      const result = await senseState(text, previous);

      return result as unknown as Record<string, unknown>;
    },
  });
}
