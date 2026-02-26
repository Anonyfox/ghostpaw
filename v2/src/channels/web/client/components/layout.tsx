import type { ComponentChildren } from "preact";
import { Link } from "wouter-preact";

interface LayoutProps {
  children: ComponentChildren;
}

export function Layout({ children }: LayoutProps) {
  const handleLogout = async (e: Event) => {
    e.preventDefault();
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  };

  return (
    <div class="d-flex vh-100">
      <nav
        class="d-flex flex-column bg-dark text-light p-3"
        style="width: 220px; min-width: 220px;"
      >
        <h5 class="mb-4">Ghostpaw</h5>
        <Link href="/dashboard" class="nav-link text-light">
          Dashboard
        </Link>
        <Link href="/chat" class="nav-link text-secondary">
          Chat
        </Link>
        <Link href="/sessions" class="nav-link text-secondary">
          Sessions
        </Link>
        <Link href="/settings" class="nav-link text-secondary">
          Settings
        </Link>
        <div class="mt-auto">
          <button type="button" class="nav-link text-secondary btn btn-link" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>
      <main class="flex-grow-1 overflow-auto p-4">{children}</main>
    </div>
  );
}
