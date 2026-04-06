"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useAppStore, Payment, Expense } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { floorDisplayLabel } from "@/lib/utils";

type Transaction =
  | { kind: "payment"; data: Payment }
  | { kind: "expense"; data: Expense };

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-CD", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function RecentTransactions() {
  const { payments, expenses, user, addComment } = useAppStore();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [kindFilter, setKindFilter] = useState<"all" | "payment" | "expense">("all");
  const [monthFilter, setMonthFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const allTransactions: Transaction[] = [
    ...payments.map((p) => ({ kind: "payment" as const, data: p })),
    ...expenses.map((e) => ({ kind: "expense" as const, data: e })),
  ].sort((a, b) => {
    const dateA = a.kind === "payment" ? a.data.date : a.data.date;
    const dateB = b.kind === "payment" ? b.data.date : b.data.date;
    return dateB.localeCompare(dateA);
  });

  const transactions = allTransactions.filter((tx) => {
    if (kindFilter !== "all" && tx.kind !== kindFilter) return false;
    if (!monthFilter) return true;
    const month = tx.kind === "payment" ? tx.data.month : tx.data.date.slice(0, 7);
    return month === monthFilter;
  });
  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize));
  const paged = transactions.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <h3 className="text-sm font-semibold text-foreground">Transactions récentes</h3>
        <p className="text-sm text-muted-foreground">Filtres et pagination</p>
        <div className="mt-3 flex gap-2">
          <select className="rounded-md border border-border bg-background px-2 py-1 text-xs" value={kindFilter} onChange={(e) => { setKindFilter(e.target.value as "all" | "payment" | "expense"); setPage(1); }}>
            <option value="all">Toutes</option>
            <option value="payment">Loyers</option>
            <option value="expense">Depenses</option>
          </select>
          <Input type="month" value={monthFilter} onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }} className="h-8 w-[170px]" />
        </div>
      </div>
      <div className="divide-y divide-border">
        {paged.length === 0 && (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            Aucune transaction pour ce filtre.
          </div>
        )}
        {paged.map((tx) => {
          const isPayment = tx.kind === "payment";
          const label = isPayment
            ? (tx.data as Payment).propertyLabel
            : (tx.data as Expense).propertyLabel;
          const sub = isPayment
            ? `Loyer – ${(tx.data as Payment).paymentKind === "rental" ? `${(tx.data as Payment).monthsCount ?? 1} mois` : (tx.data as Payment).month}${(tx.data as Payment).propertyType === "land" ? " · Terrain" : ((tx.data as Payment).propertyType === "house" || (tx.data as Payment).propertyType === "building") && (tx.data as Payment).apartmentNumber ? ` · ${typeof (tx.data as Payment).floor === "number" ? floorDisplayLabel((tx.data as Payment).floor as number) : "Niv -"} / Apt ${(tx.data as Payment).apartmentNumber}` : ""}`
            : `${(tx.data as Expense).expenseType === "common" ? "Commun" : "Privé"} – ${(tx.data as Expense).category}${
                (tx.data as Expense).expenseType === "common" && (tx.data as Expense).supplierName
                  ? ` · ${(tx.data as Expense).supplierName}`
                  : ""
              }`;
          const amount = tx.data.amount;
          const date = formatDate(tx.data.date);
          const key = `${tx.kind}-${tx.data.id}`;

          return (
            <div
              key={tx.data.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors sm:gap-4 sm:px-6"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  isPayment ? "bg-income-bg" : "bg-expense-bg"
                }`}
              >
                {isPayment ? (
                  <ArrowDownLeft className="h-4 w-4 text-income" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 text-expense" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{label}</p>
                <p className="truncate text-xs text-muted-foreground">{sub}</p>
                {!!tx.data.comments?.length && (
                  <p className="truncate text-xs text-muted-foreground">
                    {tx.data.comments[tx.data.comments.length - 1]?.author}: {tx.data.comments[tx.data.comments.length - 1]?.content}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p
                  className={`text-sm font-semibold ${
                    isPayment ? "text-income" : "text-expense"
                  }`}
                >
                  {isPayment ? "+" : "-"}{formatCurrency(amount)}
                </p>
                <p className="text-xs text-muted-foreground">{date}</p>
              </div>
              <Badge variant="outline" className="hidden shrink-0 text-xs sm:inline-flex">
                {isPayment ? "Loyer" : "Dépense"}
              </Badge>
              {user?.role === "OWNER" && (
                <div className="ml-2 flex min-w-[240px] items-center gap-2">
                  <Input
                    value={drafts[key] || ""}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder="Commentaire optionnel"
                    className="h-8"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const content = (drafts[key] || "").trim();
                      if (!content) return;
                      await addComment({
                        transactionType: isPayment ? "payment" : "expense",
                        transactionId: tx.data.id,
                        content,
                      });
                      toast.success("Commentaire ajoute.");
                      setDrafts((prev) => ({ ...prev, [key]: "" }));
                    }}
                  >
                    Envoyer
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prec.</Button>
        <span className="text-xs text-muted-foreground">Page {page}/{totalPages}</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Suiv.</Button>
      </div>
    </div>
  );
}
