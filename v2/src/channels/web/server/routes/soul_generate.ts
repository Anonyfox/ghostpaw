import { Chat } from "chatoyant";
import type { TurnContext } from "../../../../core/chat/index.ts";
import { closeSession, createSession, executeTurn } from "../../../../core/chat/index.ts";
import { getSoul, listTraits } from "../../../../core/souls/api/read/index.ts";
import { resolveModel } from "../../../../harness/model.ts";
import {
  buildDescriptionPrompt,
  buildNamePrompt,
  DESC_SYSTEM_PROMPT,
  NAME_SYSTEM_PROMPT,
} from "../../../../harness/oneshots/generate_soul_text.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { RouteContext } from "../types.ts";

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

export { buildDescriptionPrompt, buildNamePrompt };

export function createSoulGenerateHandlers(db: DatabaseHandle) {
  return {
    async generateDescription(ctx: RouteContext): Promise<void> {
      const id = Number(ctx.params.id);
      if (!Number.isFinite(id) || id < 1) {
        json(ctx, 400, { error: "Invalid soul ID." });
        return;
      }
      const soul = getSoul(db, id);
      if (!soul) {
        json(ctx, 404, { error: "Soul not found." });
        return;
      }
      if (soul.deletedAt !== null) {
        json(ctx, 400, { error: "Dormant souls cannot be modified." });
        return;
      }

      const traits = listTraits(db, id, { status: "active" });
      const prompt = buildDescriptionPrompt(
        soul.name,
        soul.essence,
        traits.map((t) => t.principle),
      );

      const model = resolveModel(db);
      const turnCtx: TurnContext = {
        db,
        tools: [],
        createChat: (m: string) => new Chat({ model: m }),
      };
      const systemSession = createSession(db, `system:soul-desc:${id}:${Date.now()}`, {
        purpose: "system",
      });
      const sessionId = systemSession.id as number;

      try {
        const result = await executeTurn(
          {
            sessionId,
            content: prompt,
            systemPrompt: DESC_SYSTEM_PROMPT,
            model,
            maxIterations: 1,
            maxTokens: 150,
          },
          turnCtx,
        );
        const description = result.content.trim().replace(/^["']|["']$/g, "");
        if (description && !description.startsWith("Error:")) {
          json(ctx, 200, { description });
        } else {
          json(ctx, 500, { error: "Failed to generate suggestion." });
        }
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      } finally {
        closeSession(db, sessionId);
      }
    },

    async generateName(ctx: RouteContext): Promise<void> {
      const id = Number(ctx.params.id);
      if (!Number.isFinite(id) || id < 1) {
        json(ctx, 400, { error: "Invalid soul ID." });
        return;
      }
      const soul = getSoul(db, id);
      if (!soul) {
        json(ctx, 404, { error: "Soul not found." });
        return;
      }
      if (soul.deletedAt !== null) {
        json(ctx, 400, { error: "Dormant souls cannot be modified." });
        return;
      }

      const prompt = buildNamePrompt(soul.name, soul.description, soul.essence);
      const model = resolveModel(db);
      const turnCtx: TurnContext = {
        db,
        tools: [],
        createChat: (m: string) => new Chat({ model: m }),
      };
      const systemSession = createSession(db, `system:soul-name:${id}:${Date.now()}`, {
        purpose: "system",
      });
      const sessionId = systemSession.id as number;

      try {
        const result = await executeTurn(
          {
            sessionId,
            content: prompt,
            systemPrompt: NAME_SYSTEM_PROMPT,
            model,
            maxIterations: 1,
            maxTokens: 30,
          },
          turnCtx,
        );
        const raw = result.content.trim().replace(/^["']|["']$/g, "");
        if (!raw || raw.startsWith("Error:")) {
          json(ctx, 500, { error: "Failed to generate suggestion." });
          return;
        }
        json(ctx, 200, { name: raw });
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      } finally {
        closeSession(db, sessionId);
      }
    },
  };
}
