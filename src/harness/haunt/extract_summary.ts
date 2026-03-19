const SUMMARY_MARKER = "## Summary";
const FALLBACK_MAX_LENGTH = 500;

export function extractSummary(response: string): string {
  const idx = response.lastIndexOf(SUMMARY_MARKER);
  if (idx !== -1) {
    const after = response.slice(idx + SUMMARY_MARKER.length).trim();
    if (after.length > 0) return after;
  }

  const trimmed = response.trim();
  if (trimmed.length <= FALLBACK_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, FALLBACK_MAX_LENGTH)}...`;
}
