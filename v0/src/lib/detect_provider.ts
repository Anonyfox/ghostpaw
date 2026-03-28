import type { ChatConfig, ProviderId } from "chatoyant";
import { detectProviderByModel } from "chatoyant";

const EXTRA_SIGNATURES: [string, ProviderId][] = [["o4", "openai"]];

/**
 * Resolves chatoyant ChatConfig for a model, always setting the provider
 * explicitly. Chatoyant's Chat class may default to anthropic when the
 * model string isn't in its full model list, even if detectProviderByModel
 * recognizes it by signature. This ensures the provider is always explicit.
 */
export function chatConfigForModel(model: string): ChatConfig {
  const detected = detectProviderByModel(model);
  if (detected) {
    return { model, defaults: { provider: detected } };
  }

  const lower = model.toLowerCase();
  for (const [sig, provider] of EXTRA_SIGNATURES) {
    if (lower.includes(sig)) {
      return { model, defaults: { provider } };
    }
  }

  return { model };
}
