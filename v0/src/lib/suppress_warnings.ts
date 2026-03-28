const originalEmit = process.emit;

process.emit = ((event: string, ...args: unknown[]) => {
  if (
    event === "warning" &&
    typeof args[0] === "object" &&
    args[0] !== null &&
    (args[0] as { name?: string }).name === "ExperimentalWarning"
  ) {
    return false;
  }
  return originalEmit.apply(process, [event, ...args] as Parameters<typeof process.emit>);
}) as typeof process.emit;
