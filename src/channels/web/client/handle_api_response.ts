export async function handleApiResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    window.location.assign("/login");
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { error?: string }).error ?? res.statusText;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}
