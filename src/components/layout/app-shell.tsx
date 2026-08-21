import Link from "next/link";
import { ClipboardList, LayoutDashboard, ListChecks, Route as RouteIcon, Truck } from "lucide-react";

import { auth } from "@/auth";
import { UserMenu } from "@/components/layout/user-menu";
import { cn } from "@/lib/utils";

const DISPATCHER_NAV_ITEMS = [
  { href: "/", label: "Dépôt & Pharmacies", icon: LayoutDashboard },
  { href: "/optimize", label: "Optimisation", icon: RouteIcon },
  { href: "/results", label: "Résultats", icon: ClipboardList },
];

const DRIVER_NAV_ITEMS = [{ href: "/my-routes", label: "Mes tournées", icon: ListChecks }];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const navItems = session?.user.role === "DRIVER" ? DRIVER_NAV_ITEMS : DISPATCHER_NAV_ITEMS;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Truck className="h-[18px] w-[18px]" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">PharmaRoute FX</p>
              <p className="text-[11px] text-muted-foreground">
                Optimisation de tournées &mdash; Belgique
              </p>
            </div>
          </div>

          {session?.user && (
            <div className="flex items-center gap-2">
              <nav className="flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                ))}
              </nav>
              <div className="mx-1 h-6 w-px bg-border" aria-hidden />
              <UserMenu name={session.user.name ?? session.user.email ?? ""} role={session.user.role} />
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
