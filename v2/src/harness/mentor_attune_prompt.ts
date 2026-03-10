export function buildAttunePrompt(soulName: string, formattedEvidence: string): string {
  return [
    `The "${soulName}" soul has accumulated behavioral evidence that may warrant a trait change.`,
    "",
    "Evidence report:",
    formattedEvidence,
    "",
    "Review the pending soulshards alongside the delegation stats and current traits.",
    "If a clear behavioral pattern crystallizes from the evidence cluster:",
    "- propose_trait with the crystallized principle, citing specific shard IDs in provenance",
    "  and passing them via the shard_ids parameter",
    "If existing traits need revision based on new evidence:",
    "- revise_trait with updated principle and shard-backed provenance",
    "If a trait is contradicted by evidence:",
    "- revert_trait citing the contradicting shards",
    "",
    "Act only on strong evidence clusters. Pass if the shards don't converge into a clear pattern.",
    "One change per attunement. Quality over quantity.",
  ].join("\n");
}
