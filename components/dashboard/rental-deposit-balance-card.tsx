"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { useAppStore } from "@/lib/store";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-CD", { style: "currency", currency: "USD" }).format(amount);
}

export function RentalDepositBalanceCard() {
  const { rentalDeposits } = useAppStore();
  const total = rentalDeposits.reduce((s, r) => s + (r.balance ?? 0), 0);
  return (
    <Link
      href="/rental-deposits"
      className="block rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:bg-muted/30"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Solde garantie locative</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(total)}</p>
          <p className="text-xs text-muted-foreground">{rentalDeposits.length} enregistrement(s)</p>
        </div>
        <div className="rounded-lg p-2.5 bg-muted">
          <Shield className="h-5 w-5 text-foreground" />
        </div>
      </div>
    </Link>
  );
}

