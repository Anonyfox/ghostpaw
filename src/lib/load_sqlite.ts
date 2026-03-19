export async function loadSqlite() {
  try {
    return await import("node:sqlite");
  } catch (err) {
    throw new Error("Failed to load node:sqlite. Ensure Node.js >= 24 is installed.", {
      cause: err,
    });
  }
}
