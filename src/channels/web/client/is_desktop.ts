export function isDesktop(): boolean {
  const meta = document.querySelector('meta[name="ghostpaw-desktop"]');
  return meta?.getAttribute("content") === "1";
}
