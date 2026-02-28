const locks = new Map<number, Promise<void>>();

export async function acquireSessionLock(sessionId: number): Promise<() => void> {
  const prev = locks.get(sessionId) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  locks.set(sessionId, next);
  await prev;
  return () => {
    release();
    if (locks.get(sessionId) === next) {
      locks.delete(sessionId);
    }
  };
}
