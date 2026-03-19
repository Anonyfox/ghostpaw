import { handleApiResponse } from "./handle_api_response.ts";

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "same-origin" });
  return handleApiResponse<T>(res);
}
