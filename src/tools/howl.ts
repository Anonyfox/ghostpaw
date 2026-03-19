import { createTool, Schema } from "chatoyant";
import type { HowlUrgency } from "../core/chat/api/read/howls/index.ts";
import { countHowlsToday, lastHowlTime } from "../core/chat/api/read/howls/index.ts";
import { createHowl, deliverHowl } from "../core/chat/api/write/howls/index.ts";
import { getConfig } from "../core/config/api/read/index.ts";
import {
  getCuriosityHowlCandidate,
  getOutreachPolicy,
  getPreferredHowlMode,
} from "../core/trail/api/read/index.ts";
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

export interface HowlToolContext {
  db: DatabaseHandle;
  getCurrentSessionId: () => number | null;
  getHeadMessageId: () => number | null;
}

export function createHowlTool(ctx: HowlToolContext) {
  const { db, getCurrentSessionId, getHeadMessageId } = ctx;

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

      const originSessionId = getCurrentSessionId();
      if (originSessionId == null) {
        return { error: "Cannot howl outside of an active session." };
      }

      const maxPerDay = (getConfig(db, "max_howls_per_day") as number | null) ?? 3;
      const cooldownMinutes = (getConfig(db, "howl_cooldown_minutes") as number | null) ?? 60;

      let effectiveMax = maxPerDay;
      let effectiveCooldownMs = cooldownMinutes * 60_000;
      let preferredTone: string | null = null;
      let curiosityQuestion: string | null = null;
      try {
        const policy = getOutreachPolicy(db);
        effectiveMax = Math.min(maxPerDay, policy.maxDailyOutreach);
        effectiveCooldownMs = Math.max(cooldownMinutes * 60_000, policy.minGapMs);
        preferredTone = getPreferredHowlMode(db);
        const candidate = getCuriosityHowlCandidate(db);
        if (candidate) curiosityQuestion = candidate.question;
      } catch {
        /* fail-open: trail tables may not exist yet */
      }

      const todayCount = countHowlsToday(db);
      if (todayCount >= effectiveMax) {
        return { error: `Daily howl limit reached (${effectiveMax}). Try again tomorrow.` };
      }

      if (urgency !== "high") {
        const lastTime = lastHowlTime(db);
        if (lastTime !== null) {
          const elapsed = Date.now() - lastTime;
          if (elapsed < effectiveCooldownMs) {
            const remaining = Math.ceil((effectiveCooldownMs - elapsed) / 60_000);
            return { error: `Cooldown active. ${remaining} minutes remaining.` };
          }
        }
      }

      const howl = createHowl(db, {
        originSessionId,
        originMessageId: getHeadMessageId(),
        message,
        urgency,
      });
      const delivery = await deliverHowl(db, howl);

      return {
        howlId: howl.id,
        sessionId: howl.sessionId,
        delivered: delivery.delivered,
        channel: delivery.channel,
        mode: delivery.mode,
        ...(preferredTone ? { preferredTone } : {}),
        ...(curiosityQuestion ? { curiosityQuestion } : {}),
        note: "The user won't reply before this session ends. Continue your work.",
      };
    },
  });
}
