import { createTool, Schema } from "chatoyant";
import { createSession } from "../core/chat/index.ts";
import { getConfig } from "../core/config/index.ts";
import { countHowlsToday, lastHowlTime, storeHowl, updateHowlChannel } from "../core/howl/index.ts";
import type { HowlUrgency } from "../core/howl/index.ts";
import { getBestChannel } from "../lib/channel_registry.ts";
import type { DatabaseHandle } from "../lib/index.ts";

class HowlParams extends Schema {
  message = Schema.String({
    description:
      "A genuine question or alert for the user — written playfully, in your voice as their companion. " +
      "Must invite dialogue, not deliver a report. Never a summary of what you did.",
  });
  urgency = Schema.Enum(["low", "high"] as const, {
    optional: true,
    description:
      "High = deliver immediately to connected channels. Low = store, mention on next interaction. Default: low.",
  });
}

export function createHowlTool(db: DatabaseHandle) {
  return createTool({
    name: "howl",
    description:
      "Reach out to the user — but ONLY when you hit a genuine question you cannot " +
      "answer by any other means, feel real curiosity about something fundamental, " +
      "or detect a critical incident / incoming danger for Ghostpaw itself. " +
      "Never for summaries, reports, or 'here's what I did'. " +
      "Write playfully, in-theme, like a companion who has something worth talking about. " +
      "The user won't reply before this session ends. Rate-limited.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new HowlParams() as any,
    execute: async ({ args }) => {
      const { message, urgency: rawUrgency } = args as {
        message: string;
        urgency?: string;
      };
      const urgency: HowlUrgency = rawUrgency === "high" ? "high" : "low";

      const maxPerDay = (getConfig(db, "max_howls_per_day") as number | null) ?? 3;
      const cooldownMinutes = (getConfig(db, "howl_cooldown_minutes") as number | null) ?? 60;

      const todayCount = countHowlsToday(db);
      if (todayCount >= maxPerDay) {
        return { error: `Daily howl limit reached (${maxPerDay}). Try again tomorrow.` };
      }

      if (urgency !== "high") {
        const lastTime = lastHowlTime(db);
        if (lastTime !== null) {
          const elapsed = Date.now() - lastTime;
          const cooldownMs = cooldownMinutes * 60_000;
          if (elapsed < cooldownMs) {
            const remaining = Math.ceil((cooldownMs - elapsed) / 60_000);
            return { error: `Cooldown active. ${remaining} minutes remaining.` };
          }
        }
      }

      const session = createSession(db, `howl:${Date.now()}`, { purpose: "howl" });
      const sessionId = session.id as number;

      const channel = getBestChannel();
      const howl = storeHowl(db, {
        sessionId,
        message,
        urgency,
        channel: channel?.type ?? null,
      });

      if (channel && urgency === "high") {
        try {
          await channel.send(message);
          updateHowlChannel(db, howl.id, channel.type);
        } catch {
          // Delivery failed — howl is stored, will appear in web UI
        }
      }

      return {
        howlId: howl.id,
        delivered: channel !== null && urgency === "high",
        channel: channel?.type ?? "stored",
        note: "The user won't reply before this session ends. Continue your work.",
      };
    },
  });
}
