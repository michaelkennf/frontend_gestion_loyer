"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useAppStore } from "@/lib/store";

function getMonthLabel(ym: string) {
  const [year, month] = ym.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString("fr-FR", {
    month: "short",
    year: "2-digit",
  });
}

export function MonthlyChart() {
  const { payments, expenses } = useAppStore();

  // Build a map of month -> { income, expense }
  const monthMap: Record<string, { income: number; expense: number }> = {};

  for (const p of payments) {
    if (!monthMap[p.month]) monthMap[p.month] = { income: 0, expense: 0 };
    monthMap[p.month].income += p.amount;
  }

  for (const e of expenses) {
    const ym = e.date.slice(0, 7); // YYYY-MM
    if (!monthMap[ym]) monthMap[ym] = { income: 0, expense: 0 };
    monthMap[ym].expense += e.amount;
  }

  const data = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12) // last 12 months
    .map(([month, values]) => ({
      month: getMonthLabel(month),
      Loyers: values.income,
      Dépenses: values.expense,
    }));

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-foreground">Évolution mensuelle</h3>
        <p className="text-sm text-muted-foreground mb-4">Loyers vs. dépenses par mois</p>
        <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
          Aucune donnée à afficher pour le moment.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-1 text-sm font-semibold text-foreground">Évolution mensuelle</h3>
      <p className="text-sm text-muted-foreground mb-6">Loyers vs. dépenses par mois</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} barGap={4} barSize={20}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "0.5rem",
              fontSize: "12px",
            }}
            formatter={(value: number) =>
              new Intl.NumberFormat("fr-CD", { style: "currency", currency: "USD" }).format(value)
            }
          />
          <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }} />
          <Bar dataKey="Loyers" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Dépenses" fill="var(--color-expense)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
