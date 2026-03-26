"use client";

import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useAppStore } from "@/lib/store";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-CD", { style: "currency", currency: "USD" }).format(amount);
}

export function SummaryCards() {
  const { payments, expenses } = useAppStore();

  const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const balance = totalIncome - totalExpenses;

  const cards = [
    {
      label: "Loyers encaissés",
      value: formatCurrency(totalIncome),
      icon: TrendingUp,
      bg: "bg-income-bg",
      text: "text-income",
      count: `${payments.length} paiement${payments.length !== 1 ? "s" : ""}`,
    },
    {
      label: "Dépenses totales",
      value: formatCurrency(totalExpenses),
      icon: TrendingDown,
      bg: "bg-expense-bg",
      text: "text-expense",
      count: `${expenses.length} dépense${expenses.length !== 1 ? "s" : ""}`,
    },
    {
      label: "Solde net",
      value: formatCurrency(balance),
      icon: Wallet,
      bg: "bg-balance-bg",
      text: balance >= 0 ? "text-income" : "text-expense",
      count: balance >= 0 ? "Positif" : "Déficitaire",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.count}</p>
              </div>
              <div className={`rounded-lg p-2.5 ${card.bg}`}>
                <Icon className={`h-5 w-5 ${card.text}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
