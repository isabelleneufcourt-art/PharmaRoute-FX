import Link from "next/link";
import { Truck, LayoutDashboard, Route as RouteIcon, ClipboardList } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  { href: "/", label: "Dépôt & Pharmacies", icon: LayoutDashboard, enabled: true },
  { href: "/optimize", label: "Optimisation", icon: RouteIcon, enabled: true },
  { href: "/results", label: "Résultats", icon: ClipboardList, enabled: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
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

          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.enabled ? item.href : "#"}
                aria-disabled={!item.enabled}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  item.enabled
                    ? "text-foreground hover:bg-accent hover:text-accent-foreground"
                    : "pointer-events-none text-muted-foreground/50"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {!item.enabled && (
                  <Badge variant="outline" className="ml-1 text-[10px]">
                    Bientôt
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
