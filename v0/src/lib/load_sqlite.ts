export async function loadSqlite(): Promise<typeof import("node:sqlite")> {
  return await import("node:sqlite");
}
