"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NAV_ITEMS, isActive } from "@/lib/nav";
import { Icon } from "./icons";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const bottomItems = NAV_ITEMS.filter((i) => i.bottom);

  return (
    <div className="min-h-dvh md:flex">
      {/* ── Barre latérale (tablette large / desktop) ── */}
      <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:border-neutral-800 md:bg-neutral-950">
        <div className="px-5 py-6">
          <p className="text-lg font-semibold tracking-tight text-neutral-100">
            Guitare
          </p>
          <p className="text-xs text-neutral-500">Théorie &amp; pratique</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors " +
                  (active
                    ? "bg-neutral-800 text-emerald-400"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100")
                }
              >
                <Icon name={item.icon} className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3">
          <button
            type="button"
            onClick={logout}
            className="min-h-11 w-full rounded-lg px-3 text-left text-sm text-neutral-500 hover:bg-neutral-900 hover:text-neutral-200"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Colonne principale ── */}
      <div className="flex min-h-dvh flex-1 flex-col">
        {/* En-tête (mobile uniquement) */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-950/90 px-4 py-3 backdrop-blur md:hidden">
          <span className="font-semibold text-neutral-100">Guitare</span>
          <button
            type="button"
            onClick={logout}
            className="min-h-11 px-2 text-sm text-neutral-400"
          >
            Déconnexion
          </button>
        </header>

        <main className="flex-1 px-4 py-5 pb-28 md:px-8 md:py-8 md:pb-10">
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </main>
      </div>

      {/* ── Barre du bas (mobile) ── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="flex">
          {bottomItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    "flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors " +
                    (active ? "text-emerald-400" : "text-neutral-400")
                  }
                >
                  <Icon name={item.icon} className="h-6 w-6" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
