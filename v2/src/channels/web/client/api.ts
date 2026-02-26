export async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "same-origin" });
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

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
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

export async function apiDelete<T = unknown>(path: string): Promise<T> {
  const res = await fetch(path, { method: "DELETE", credentials: "same-origin" });
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
