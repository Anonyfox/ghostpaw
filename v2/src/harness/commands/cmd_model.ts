import { setConfig } from "../../core/config/api/write/index.ts";
import { closestMatches } from "../../lib/levenshtein.ts";
import type { ListProvidersParams, ProviderInfo } from "../../lib/models/index.ts";
import { listProviders as defaultListProviders } from "../../lib/models/index.ts";
import { resolveModel } from "../model.ts";
import type { CommandContext, CommandResult } from "./types.ts";

export type ProviderFetcher = (params: ListProvidersParams) => Promise<ProviderInfo[]>;

export async function executeModel(
  ctx: CommandContext,
  args: string,
  fetchProviders: ProviderFetcher = defaultListProviders,
): Promise<CommandResult> {
  const name = args.trim();
  const currentModel = resolveModel(ctx.db);
  const providers = await fetchProviders({
    currentModel,
    configuredKeys: ctx.configuredKeys,
  });
  const allModelIds = providers.flatMap((p) => p.models);

  if (!name) {
    return { text: formatModelList(providers, currentModel) };
  }

  if (allModelIds.includes(name)) {
    setConfig(ctx.db, "default_model", name, "cli");
    return {
      text: `Model set to ${name}.`,
      action: { type: "model_changed", model: name },
    };
  }

  if (allModelIds.length === 0) {
    return { text: "No models available. Configure an API key first." };
  }

  const suggestions = closestMatches(name, allModelIds, 3);
  const lines = suggestions.map((s) => `  ${s}`);
  return { text: `Unknown model "${name}". Did you mean:\n${lines.join("\n")}` };
}

function formatModelList(providers: ProviderInfo[], currentModel: string): string {
  const sections: string[] = [`Current: ${currentModel}`];

  for (const p of providers) {
    if (p.models.length === 0) continue;
    const status = p.hasKey ? "configured" : "no key";
    const header = `${p.name} (${status}):`;
    const models = p.models.map((m) => (m === currentModel ? `  ${m}  [active]` : `  ${m}`));
    sections.push(`${header}\n${models.join("\n")}`);
  }

  return sections.join("\n\n");
}
