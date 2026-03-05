export class SpendLimitError extends Error {
  readonly spent: number;
  readonly limit: number;

  constructor(spent: number, limit: number) {
    const spentStr = `$${spent.toFixed(4)}`;
    const limitStr = `$${limit.toFixed(2)}`;
    super(`Daily spend limit reached (${spentStr} / ${limitStr}). Adjust in Settings > Costs.`);
    this.name = "SpendLimitError";
    this.spent = spent;
    this.limit = limit;
  }
}
