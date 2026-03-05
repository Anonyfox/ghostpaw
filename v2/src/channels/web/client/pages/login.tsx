import { useState } from "preact/hooks";

export function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          window.location.assign("/dashboard");
          return;
        }
      }
      if (res.status === 401) {
        setError("Invalid password.");
      } else {
        setError("Something went wrong.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="d-flex align-items-center justify-content-center vh-100">
      <div class="card border shadow" style="width: 360px;">
        <div class="card-body">
          <h4 class="card-title mb-3 text-info">Ghostpaw</h4>
          <p class="text-muted mb-4">Enter your password to continue.</p>
          {error && <div class="alert alert-danger">{error}</div>}
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              class="form-control mb-3"
              placeholder="Password"
              value={password}
              onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
              // biome-ignore lint/a11y/noAutofocus: login page is the entry point, focus on password field is intentional UX
              autoFocus
            />
            <button type="submit" class="btn btn-primary w-100" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
