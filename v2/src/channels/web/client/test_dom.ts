import { Window } from "happy-dom";

/**
 * Creates an isolated DOM environment for component tests.
 * Each test gets a fresh Window + Document + container element,
 * ensuring no state leaks between tests. Call `cleanup()` in afterEach.
 */
/**
 * Polls a condition until it returns true, or throws after timeout.
 * Replaces fixed-delay `waitForEffects()` patterns that are fragile under load.
 */
export async function waitFor(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (condition()) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error(`waitFor: condition not met within ${timeoutMs}ms`);
}

export function createTestDOM() {
  const window = new Window({ url: "http://localhost" });

  // happy-dom's types don't perfectly match lib.dom.d.ts, but the runtime
  // API surface is compatible enough for Preact's render(). Force the cast.
  // biome-ignore lint/suspicious/noExplicitAny: happy-dom ↔ lib.dom type gap
  globalThis.document = window.document as any;
  // biome-ignore lint/suspicious/noExplicitAny: happy-dom ↔ lib.dom type gap
  globalThis.window = window as any;

  const container = window.document.createElement("div");
  container.id = "test-root";
  window.document.body.appendChild(container);

  return {
    window,
    document: window.document,
    container: container as unknown as HTMLElement,
    cleanup() {
      window.close();
    },
  };
}
