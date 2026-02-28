import { detectProviderByModel, isProviderActive } from "chatoyant";
import { getConfig, setConfig } from "../../../../core/config/index.ts";
import { isProviderId, listProviders } from "../../../../core/models/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { ModelsResponse } from "../../shared/models_response.ts";
import { readJsonBody } from "../body_parser.ts";
import type { RouteContext } from "../types.ts";
import { modelsCache } from "./models_cache.ts";

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

export function createModelsApiHandlers(db: DatabaseHandle) {
  return {
    async list(ctx: RouteContext): Promise<void> {
      // default_model is a known key with a string default — always returns string
      const currentModel = getConfig(db, "default_model") as string;
      let currentProvider: string | null = null;
      try {
        const detected = detectProviderByModel(currentModel);
        if (detected && isProviderId(detected)) {
          currentProvider = detected;
        }
      } catch {
        // unrecognized model — fall through with null provider
      }

      let providers = modelsCache.get();
      if (!providers) {
        providers = await listProviders(db);
        modelsCache.set(providers);
      }

      const response: ModelsResponse = { currentModel, currentProvider, providers };
      json(ctx, 200, response);
    },

    async set(ctx: RouteContext): Promise<void> {
      let body: unknown;
      try {
        body = await readJsonBody(ctx.req);
      } catch {
        json(ctx, 400, { error: "Invalid request body." });
        return;
      }

      if (typeof body !== "object" || body === null) {
        json(ctx, 400, { error: "Invalid request body." });
        return;
      }

      const { model } = body as Record<string, unknown>;
      if (typeof model !== "string" || !model.trim()) {
        json(ctx, 400, { error: "Missing or empty model." });
        return;
      }

      let provider: string | null = null;
      try {
        provider = detectProviderByModel(model.trim());
      } catch {
        // unknown model
      }

      if (!provider) {
        json(ctx, 400, { error: `Unknown model: "${model.trim()}"` });
        return;
      }

      if (!isProviderId(provider) || !isProviderActive(provider)) {
        json(ctx, 400, {
          error: `Provider ${provider} is not active. Add the API key first.`,
        });
        return;
      }

      setConfig(db, "default_model", model.trim(), "web");
      modelsCache.invalidate();
      json(ctx, 200, { ok: true, model: model.trim(), provider });
    },
  };
}
