export function suppressWarnings(): void {
  const originalEmit = process.emit.bind(process);
  process.emit = ((event: string, ...args: unknown[]) => {
    if (event === "warning") {
      const w = args[0] as { name?: string; message?: string };
      if (w?.name === "ExperimentalWarning") return false;
      if (w?.name === "DeprecationWarning" && w?.message?.includes("punycode")) return false;
    }
    return originalEmit(event, ...args);
  }) as typeof process.emit;
}
