import type { OneshotRegistry, OneshotRunOpts } from "./types.ts";

function withTimeout(promise: Promise<void>, ms: number, name: string): Promise<void> {
  return Promise.race([
    promise,
    new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error(`oneshot '${name}' timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export async function fireOneshots(registry: OneshotRegistry, opts: OneshotRunOpts): Promise<void> {
  const defs = registry.list().filter((d) => d.shouldFire(opts));
  if (defs.length === 0) return;

  const tasks = defs.map((def) =>
    withTimeout(def.execute(opts), opts.timeoutMs, def.name).catch((err) => {
      console.error(`[oneshot] ${def.name} failed:`, err instanceof Error ? err.message : err);
    }),
  );

  await Promise.allSettled(tasks);
}
