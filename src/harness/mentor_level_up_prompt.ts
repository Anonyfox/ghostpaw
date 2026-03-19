export function buildLevelUpPrompt(soulName: string): string {
  return [
    `The "${soulName}" soul is ready for a level-up. Orchestrate the full process:`,
    "",
    "1. Use review_soul to assess the current state and all active traits",
    "2. Decide which traits to consolidate (merge related ones), promote (weave into essence),",
    "   or carry forward unchanged",
    "3. Every active trait must be accounted for in exactly one category",
    "4. Write a new essence that preserves the soul's voice and subliminal coding while",
    "   naturally integrating promoted trait knowledge",
    "5. Execute the level-up with execute_level_up",
    "",
    "Proceed carefully. This is irreversible except through emergency revert.",
    "The essence rewrite is the most critical part — preserve identity, weave in growth.",
  ].join("\n");
}
