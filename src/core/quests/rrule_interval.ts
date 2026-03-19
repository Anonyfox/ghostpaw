const FREQ_MS: Record<string, number> = {
  DAILY: 86_400_000,
  WEEKLY: 604_800_000,
  MONTHLY: 2_592_000_000,
  YEARLY: 31_536_000_000,
};

/**
 * Extract the expected interval between occurrences from an RRULE string.
 * For WEEKLY rules with BYDAY, divides the weekly interval by the number of days.
 * Returns milliseconds.
 */
export function parseRRuleInterval(rrule: string): number {
  const freqMatch = rrule.match(/FREQ=(\w+)/);
  if (!freqMatch) {
    throw new Error(`Cannot parse FREQ from RRULE: ${rrule}`);
  }

  const freq = freqMatch[1];
  const base = FREQ_MS[freq];
  if (base === undefined) {
    throw new Error(`Unsupported FREQ value: ${freq}`);
  }

  if (freq === "WEEKLY") {
    const byDayMatch = rrule.match(/BYDAY=([A-Z,]+)/);
    if (byDayMatch) {
      const dayCount = byDayMatch[1].split(",").length;
      if (dayCount > 1) return Math.floor(base / dayCount);
    }
  }

  return base;
}
