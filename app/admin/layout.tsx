"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isGateEnabled, isAuthenticated, logout as gateLogout } from "@/lib/gate";
import {
  LayoutDashboard,
  Map,
  LayoutTemplate,
  Sparkles,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/maps", label: "Meus Mapas", icon: Map },
  { href: "/admin/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/admin/upgrade", label: "Planos", icon: Sparkles },
  { href: "/admin/settings/integrations", label: "Integrações", icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Gate mode: redirect to login if not authenticated
  useEffect(() => {
    if (isGateEnabled() && !isAuthenticated() && !pathname.includes("/login")) {
      router.push("/admin/login");
    }
  }, [pathname, router]);

  async function handleSignOut() {
    // Clear Gate tokens (works in both modes)
    gateLogout();
    // Also clear Supabase session (standalone mode)
    if (!isGateEnabled()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push("/admin/login");
  }

  if (pathname.includes("/edit") || pathname.includes("/login")) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        {/* Sidebar — Desktop (sticky) */}
        <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface md:flex sticky top-0 h-screen overflow-y-auto">
          <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
            <Image
              src="/logo-horizontal.svg"
              alt="eximIA"
              width={110}
              height={24}
            />
            <div className="h-5 w-px bg-border-light" />
            <div className="flex flex-col">
              <span className="text-sm font-body font-black tracking-[0.12em] text-primary">
                MAPS
              </span>
              <div
                className="h-[2px] w-full rounded-full"
                style={{ backgroundColor: "#82B4C4" }}
              />
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-[#82B4C4]/10 text-[#82B4C4] font-medium"
                      : "text-muted hover:bg-elevated hover:text-primary"
                  )}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border p-3 space-y-1">
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted hover:bg-elevated hover:text-primary"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </aside>

        {/* Mobile header */}
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-5 md:hidden">
            <div className="flex items-center gap-2">
              <Image
                src="/logo-horizontal.svg"
                alt="eximIA"
                width={90}
                height={20}
              />
              <div className="h-4 w-px bg-border-light" />
              <span className="text-xs font-body font-black tracking-[0.12em] text-primary">
                MAPS
              </span>
            </div>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2">
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </header>

          {mobileOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setMobileOpen(false)}
            >
              <nav
                className="absolute left-0 top-14 bottom-0 w-72 max-w-[calc(100vw-3rem)] bg-surface border-r border-border p-4 shadow-xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex-1 space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const isActive = item.exact
                      ? pathname === item.href
                      : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors",
                          isActive
                            ? "bg-[#82B4C4]/10 text-[#82B4C4] font-medium"
                            : "text-muted hover:bg-elevated hover:text-primary"
                        )}
                      >
                        <item.icon size={18} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
                <div className="border-t border-border pt-3 space-y-1">
                  <ThemeToggle className="w-full px-4 py-3 gap-3" />
                  <button
                    onClick={() => { setMobileOpen(false); handleSignOut(); }}
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-muted hover:bg-elevated hover:text-primary"
                  >
                    <LogOut size={18} />
                    Sair
                  </button>
                </div>
              </nav>
            </div>
          )}

          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
