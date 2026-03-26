"use client";

import { Home, Building2 } from "lucide-react";
import { useAppStore } from "@/lib/store";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-CD", { style: "currency", currency: "USD" }).format(amount);
}

export function PropertyOverview() {
  const { houses, studios } = useAppStore();

  const totalMonthlyRent =
    houses.reduce(
      (sum, h) =>
        sum +
        (h.layout ?? []).reduce(
          (s, lvl) => s + lvl.apartments.reduce((ss, apt) => ss + apt.rentPrice, 0),
          0
        ),
      0
    ) +
    studios.reduce((sum, s) => sum + s.monthlyRent, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-1 text-sm font-semibold text-foreground">Parc immobilier</h3>
      <p className="mb-4 text-sm text-muted-foreground">Aperçu de vos biens</p>

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-balance-bg">
              <Home className="h-4 w-4 text-balance" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Maisons</p>
              <p className="text-xs text-muted-foreground">
                {houses.reduce((sum, h) => sum + h.apartments, 0)} appartement{houses.reduce((sum, h) => sum + h.apartments, 0) !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <span className="text-lg font-bold text-foreground">{houses.length}</span>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-income-bg">
              <Building2 className="h-4 w-4 text-income" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Studios</p>
              <p className="text-xs text-muted-foreground">Unités individuelles</p>
            </div>
          </div>
          <span className="text-lg font-bold text-foreground">{studios.length}</span>
        </div>

        <div className="mt-2 border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Loyer mensuel potentiel</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(totalMonthlyRent)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
