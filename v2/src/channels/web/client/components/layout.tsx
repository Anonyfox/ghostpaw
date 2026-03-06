import type { ComponentChildren } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { Link, useLocation } from "wouter-preact";

interface LayoutProps {
  children: ComponentChildren;
}

function NavItem({ href, label }: { href: string; label: string }) {
  const [location] = useLocation();
  const active = location === href || (href !== "/" && location.startsWith(href));
  return (
    <li class="nav-item">
      <Link
        href={href}
        class={`nav-link ${active ? "text-info fw-semibold" : "text-body-secondary"}`}
      >
        {label}
      </Link>
    </li>
  );
}

const HOWL_POLL_MS = 30_000;

function HowlsNavItem() {
  const [location] = useLocation();
  const active = location === "/howls" || location.startsWith("/howls/");
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(() => {
    fetch("/api/howls/pending", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.count === "number") setCount(data.count);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, HOWL_POLL_MS);
    return () => clearInterval(id);
  }, [fetchCount]);

  return (
    <li class="nav-item">
      <Link
        href="/howls"
        class={`nav-link ${active ? "text-info fw-semibold" : "text-body-secondary"} d-flex align-items-center gap-1`}
      >
        Howls
        {count > 0 && (
          <span class="badge bg-info rounded-pill" style="font-size: 0.65em;">
            {count}
          </span>
        )}
      </Link>
    </li>
  );
}

export function Layout({ children }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const handleLogout = async (e: Event) => {
    e.preventDefault();
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  };

  return (
    <div class="d-flex flex-column vh-100">
      <nav class="navbar navbar-expand-md bg-body-secondary border-bottom sticky-top">
        <div class="container-fluid">
          <Link href="/dashboard" class="navbar-brand text-info fw-bold">
            Ghostpaw
          </Link>
          <button
            type="button"
            class="navbar-toggler"
            aria-label="Toggle navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span class="navbar-toggler-icon" />
          </button>
          <div class={`collapse navbar-collapse ${menuOpen ? "show" : ""}`}>
            <ul class="navbar-nav me-auto mb-2 mb-md-0">
              <NavItem href="/souls" label="Souls" />
              <NavItem href="/training-grounds" label="Skills" />
              <NavItem href="/memories" label="Memories" />
              <NavItem href="/pack" label="Pack" />
              <NavItem href="/quests" label="Quests" />
              <HowlsNavItem />
              <NavItem href="/costs" label="Costs" />
              <NavItem href="/sessions" label="Sessions" />
              <NavItem href="/chat" label="Chat" />
              <NavItem href="/settings" label="Settings" />
            </ul>
            <button
              type="button"
              class="btn btn-link nav-link text-body-tertiary"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main class="flex-grow-1 overflow-auto p-4">{children}</main>
    </div>
  );
}
