import type { Tool } from "chatoyant";
import { createTool, Schema } from "chatoyant";
import {
  updateOpenLoops,
  updatePairingWisdom,
  updateTrailState,
  writeChronicle,
} from "../../core/trail/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

// biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance limitation
type AnySchema = any;

class WriteChronicleParams extends Schema {
  date = Schema.String({ description: "Date in YYYY-MM-DD format" });
  title = Schema.String({ description: "Short chronicle title" });
  narrative = Schema.String({ description: "Full narrative text" });
  highlights = Schema.String({ description: "Key highlights", optional: true });
  surprises = Schema.String({ description: "Notable surprises", optional: true });
  unresolved = Schema.String({ description: "Unresolved threads", optional: true });
}

class UpdateTrailStateParams extends Schema {
  create_chapter_label = Schema.String({ description: "Label for new chapter", optional: true });
  create_chapter_momentum = Schema.String({
    description: "Momentum: rising, stable, declining, shifting",
    optional: true,
  });
  update_chapter_id = Schema.Integer({ description: "Chapter ID to update", optional: true });
  update_chapter_momentum = Schema.String({ description: "New momentum value", optional: true });
  end_chapter = Schema.Boolean({ description: "End the chapter?", optional: true });
  trailmarks = Schema.String({
    description:
      'JSON array of trailmarks: [{"kind":"milestone","description":"...","significance":0.8}]',
    optional: true,
  });
}

class UpdateWisdomParams extends Schema {
  create = Schema.String({
    description:
      'JSON array: [{"category":"tone","pattern":"...","guidance":"...","confidence":0.5}]',
    optional: true,
  });
  revise = Schema.String({
    description: 'JSON array: [{"id":1,"pattern":"...","guidance":"...","confidence":0.7}]',
    optional: true,
  });
  confirm = Schema.String({ description: "Comma-separated IDs to confirm", optional: true });
}

class UpdateLoopsParams extends Schema {
  create = Schema.String({
    description:
      'JSON array: [{"description":"...","significance":0.7,"category":"organic"}]. ' +
      'Use category "curiosity" for questions ghostpaw wants answered; default is "organic".',
    optional: true,
  });
  update = Schema.String({
    description: 'JSON array: [{"id":1,"significance":0.9,"status":"resolved"}]',
    optional: true,
  });
  dismiss = Schema.String({ description: "Comma-separated IDs to dismiss", optional: true });
}

export function createNightlyWriteTools(db: DatabaseHandle): Tool[] {
  return [
    createTool({
      name: "write_chronicle",
      description: "Write today's chronicle entry with narrative and structured fields.",
      parameters: new WriteChronicleParams() as AnySchema,
      execute: async ({ args }) => {
        const a = args as Record<string, unknown>;
        return writeChronicle(db, {
          date: a.date as string,
          title: a.title as string,
          narrative: a.narrative as string,
          highlights: a.highlights as string | undefined,
          surprises: a.surprises as string | undefined,
          unresolved: a.unresolved as string | undefined,
        });
      },
    }),
    createTool({
      name: "update_trail_state",
      description: "Create/update chapters and record trailmarks.",
      parameters: new UpdateTrailStateParams() as AnySchema,
      execute: async ({ args }) => {
        const a = args as Record<string, unknown>;
        return updateTrailState(db, {
          createChapter: a.create_chapter_label
            ? {
                label: a.create_chapter_label as string,
                momentum: (a.create_chapter_momentum as "rising" | "stable") ?? "stable",
              }
            : undefined,
          updateChapter: a.update_chapter_id
            ? {
                id: a.update_chapter_id as number,
                momentum: a.update_chapter_momentum as
                  | "rising"
                  | "stable"
                  | "declining"
                  | "shifting"
                  | undefined,
                endedAt: a.end_chapter ? Date.now() : undefined,
              }
            : undefined,
          trailmarks: a.trailmarks ? JSON.parse(a.trailmarks as string) : undefined,
        });
      },
    }),
    createTool({
      name: "update_pairing_wisdom",
      description: "Create, revise, or confirm pairing wisdom entries.",
      parameters: new UpdateWisdomParams() as AnySchema,
      execute: async ({ args }) => {
        const a = args as Record<string, unknown>;
        return updatePairingWisdom(db, {
          create: a.create ? JSON.parse(a.create as string) : undefined,
          revise: a.revise ? JSON.parse(a.revise as string) : undefined,
          confirm: a.confirm
            ? (a.confirm as string).split(",").map((s) => Number(s.trim()))
            : undefined,
        });
      },
    }),
    createTool({
      name: "update_open_loops",
      description: "Create, update, or dismiss open loops.",
      parameters: new UpdateLoopsParams() as AnySchema,
      execute: async ({ args }) => {
        const a = args as Record<string, unknown>;
        return updateOpenLoops(db, {
          create: a.create ? JSON.parse(a.create as string) : undefined,
          update: a.update ? JSON.parse(a.update as string) : undefined,
          dismiss: a.dismiss
            ? (a.dismiss as string).split(",").map((s) => Number(s.trim()))
            : undefined,
        });
      },
    }),
  ];
}
