import { handleApiResponse } from "./handle_api_response.ts";

export async function apiDelete<T = unknown>(path: string): Promise<T> {
  const res = await fetch(path, { method: "DELETE", credentials: "same-origin" });
  return handleApiResponse<T>(res);
}
