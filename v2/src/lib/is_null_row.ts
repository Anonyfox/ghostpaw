export function isNullRow(row: Record<string, unknown> | undefined): row is undefined {
  if (!row) return true;
  const values = Object.values(row);
  if (values.length === 0) return true;
  return values.every((v) => v === null);
}
