import { Window } from "happy-dom";

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
