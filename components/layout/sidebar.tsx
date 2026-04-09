"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Zap,
  PlusSquare,
  ListTree,
  ReceiptText,
  ArrowUpFromLine,
  TrendingDown,
  Landmark,
  Settings,
  Users,
  Building,
  Truck,
  LogOut,
  CircleUserRound,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSession, logout, SessionUser } from "@/lib/auth";
import { toast } from "sonner";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, roles: ["MANAGER", "OWNER"] },
  { href: "/actions", label: "Actions rapides", icon: Zap, roles: ["MANAGER"] },
  { type: "separator", label: "Propriétés", roles: ["MANAGER", "OWNER"] },
  { href: "/properties", label: "Liste des propriétés", icon: ListTree, roles: ["OWNER", "MANAGER"] },
  { href: "/add-property", label: "Ajouter une propriété", icon: PlusSquare, roles: ["MANAGER"] },
  { href: "/rental-deposits", label: "Garantie locative", icon: Building, roles: ["OWNER", "MANAGER"] },
  { type: "separator", label: "Finances", roles: ["MANAGER", "OWNER"] },
  { href: "/finances", label: "Entrées / Sorties", icon: ReceiptText, roles: ["OWNER", "MANAGER"] },
  { href: "/register-payment", label: "Enregistrer un loyer", icon: ArrowUpFromLine, roles: ["MANAGER"] },
  { href: "/register-tax", label: "Paiement taxe", icon: Landmark, roles: ["MANAGER"] },
  { href: "/register-expense", label: "Enregistrer une dépense", icon: TrendingDown, roles: ["MANAGER"] },
  { href: "/suppliers", label: "Fournisseurs", icon: Truck, roles: ["MANAGER"] },
  { type: "separator", label: "Système", roles: ["ADMIN"] },
  { href: "/admin-users", label: "Utilisateurs", icon: Users, roles: ["ADMIN"] },
  { href: "/settings", label: "Paramètres", icon: Settings, roles: ["ADMIN"] },
];

function NavContent({
  pathname,
  user,
  onLogout,
  onNavClick,
}: {
  pathname: string;
  user: SessionUser | null;
  onLogout: () => void;
  onNavClick?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {navItems.map((item, i) => {
            if ("roles" in item && user && !(item.roles as string[]).includes(user.role)) return null;
            if ("type" in item && item.type === "separator") {
              return (
                <li key={i} className="px-3 pb-1 pt-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-sidebar-foreground/40">
                    {item.label}
                  </span>
                </li>
              );
            }
            const Icon = (item as { icon: React.ElementType }).icon;
            const href = (item as { href: string }).href;
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavClick}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User + Logout */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        {user && (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent">
              <CircleUserRound className="h-4 w-4 text-sidebar-foreground/70" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{user.username}</p>
              <p className="truncate text-xs text-sidebar-foreground/50">{user.role === "ADMIN" ? "Administrateur" : user.role === "MANAGER" ? "Gestionnaire" : "Proprietaire"}</p>
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setUser(getSession());
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function handleLogout() {
    logout();
    toast.success("Vous êtes déconnecté.");
    router.push("/login");
  }

  const brand = (
    <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-6">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
        <Building className="h-4 w-4 text-white" />
      </div>
      <span className="text-lg font-semibold text-sidebar-foreground">LocaPro</span>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        {brand}
        <NavContent pathname={pathname} user={user} onLogout={handleLogout} />
      </aside>

      {/* ── Mobile: top bar trigger ──────────────────────── */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-base font-semibold text-sidebar-foreground">LocaPro</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* ── Mobile drawer overlay ────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer panel ──────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-primary">
              <Building className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-base font-semibold text-sidebar-foreground">LocaPro</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer le menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <NavContent
          pathname={pathname}
          user={user}
          onLogout={handleLogout}
          onNavClick={() => setMobileOpen(false)}
        />
      </aside>
    </>
  );
}
