"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAppStore } from "@/lib/store";
import { floorDisplayLabel } from "@/lib/utils";
import { ExpandableText } from "@/components/ui/expandable-text";

function monthLabel(month: string) {
  return month && /^\d{4}-\d{2}$/.test(month) ? month : "-";
}

function monthToIndex(month: string): number | null {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [y, m] = month.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  return y * 12 + (m - 1);
}

function monthIndexToLabel(index: number | null): string {
  if (index === null) return "Aucun paiement";
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export default function PropertyDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { houses, studios, lands, payments, expenses } = useAppStore();

  const house = houses.find((h) => h.id === id) ?? null;
  const studio = studios.find((s) => s.id === id) ?? null;
  const land = lands.find((l) => l.id === id) ?? null;

  const propertyLabel = house?.address ?? studio?.address ?? land?.address ?? "Propriété";
  const propertyTypeLabel = house ? (house.isBuilding ? "Immeuble" : "Maison") : studio ? "Studio" : land ? "Terrain" : "Propriété";

  const propertyPayments = payments.filter((p) => p.propertyId === id);
  const propertyExpenses = expenses.filter((e) => e.propertyId === id);
  const nowMonth = new Date().getFullYear() * 12 + new Date().getMonth();

  const overdueUnits = house
    ? (house.layout ?? [])
        .flatMap((lvl) => lvl.apartments.map((a) => ({ floor: lvl.floor, apartmentNumber: a.number })))
        .map(({ floor, apartmentNumber }) => {
          const aptPayments = propertyPayments.filter((p) => p.floor === floor && p.apartmentNumber === apartmentNumber);
          let maxCovered: number | null = null;
          for (const p of aptPayments) {
            const start = monthToIndex(p.month);
            if (start === null) continue;
            const count = p.paymentKind === "rental" ? (p.monthsCount ?? 1) : 1;
            const end = start + Math.max(1, count) - 1;
            if (maxCovered === null || end > maxCovered) maxCovered = end;
          }
          if (maxCovered !== null && maxCovered >= nowMonth) return null;
          const dueMonth = maxCovered === null ? nowMonth : maxCovered + 1;
          return {
            key: `${floor}-${apartmentNumber}`,
            label: `${floorDisplayLabel(floor)} · Apt ${apartmentNumber}`,
            lastCoveredMonth: monthIndexToLabel(maxCovered),
            firstUnpaidMonth: monthIndexToLabel(dueMonth),
            monthsLate: Math.max(1, nowMonth - dueMonth + 1),
          };
        })
        .filter((v): v is { key: string; label: string; lastCoveredMonth: string; firstUnpaidMonth: string; monthsLate: number } => Boolean(v))
    : studio
      ? (() => {
          let maxCovered: number | null = null;
          for (const p of propertyPayments) {
            const start = monthToIndex(p.month);
            if (start === null) continue;
            const count = p.paymentKind === "rental" ? (p.monthsCount ?? 1) : 1;
            const end = start + Math.max(1, count) - 1;
            if (maxCovered === null || end > maxCovered) maxCovered = end;
          }
          if (maxCovered !== null && maxCovered >= nowMonth) return [];
          const dueMonth = maxCovered === null ? nowMonth : maxCovered + 1;
          return [
            {
              key: "studio",
              label: "Studio",
              lastCoveredMonth: monthIndexToLabel(maxCovered),
              firstUnpaidMonth: monthIndexToLabel(dueMonth),
              monthsLate: Math.max(1, nowMonth - dueMonth + 1),
            },
          ];
        })()
      : [];

  return (
    <DashboardLayout title={propertyLabel} description={`Détails · ${propertyTypeLabel}`}>
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">{propertyTypeLabel}</p>
              <p className="text-xs text-muted-foreground">ID: {id}</p>
            </div>
            <Link href="/properties" className="text-sm text-primary underline">
              Retour à la liste
            </Link>
          </div>

          {house && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-muted-foreground">{house.floors} niveaux · {house.apartments} appartements</p>
              <div className="space-y-2">
                {house.layout?.map((lvl) => (
                  <div key={`${house.id}-${lvl.floor}`} className="rounded-md bg-muted/40 p-2">
                    <p className="text-xs font-medium">{floorDisplayLabel(lvl.floor)}</p>
                    <p className="text-xs text-muted-foreground">
                      {lvl.apartments.map((a) => `Apt ${a.number}: $${a.rentPrice}`).join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {studio && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">Loyer mensuel: ${studio.monthlyRent}</p>
            </div>
          )}
          {land && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">{land.size} m² · Loyer: ${land.monthlyRent}/mois</p>
            </div>
          )}
        </div>

        {overdueUnits.length > 0 && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
            <h3 className="mb-3 text-sm font-semibold text-destructive">Appartements / unité(s) en retard</h3>
            <div className="space-y-2">
              {overdueUnits.map((u) => (
                <div key={u.key} className="rounded-md border border-destructive/40 bg-background p-3">
                  <p className="text-sm font-medium text-destructive">{u.label}</p>
                  <p className="text-xs text-foreground">Dernier mois couvert: {u.lastCoveredMonth}</p>
                  <p className="text-xs text-foreground">Premier mois impayé: {u.firstUnpaidMonth}</p>
                  <p className="text-xs font-medium text-destructive">Retard: {u.monthsLate} mois</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Paiements</h3>
            <div className="space-y-2">
              {propertyPayments.map((p) => (
                <div key={p.id} className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium">{p.paymentKind === "rental" ? "Loyer locatif" : "Paiement mensuel"}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.paymentKind === "rental" ? `${p.monthsCount ?? 1} mois` : monthLabel(p.month)} · ${p.amount}
                    {typeof p.floor === "number" && p.apartmentNumber ? ` · ${floorDisplayLabel(p.floor)} / Apt ${p.apartmentNumber}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">Locataire: {p.tenantName || "-"}</p>
                  {p.notes?.trim() && (
                    <div className="mt-1">
                      <p className="text-xs font-medium text-foreground">Commentaire:</p>
                      <ExpandableText text={p.notes} />
                    </div>
                  )}
                </div>
              ))}
              {propertyPayments.length === 0 && <p className="text-sm text-muted-foreground">Aucun paiement pour cette propriété.</p>}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Dépenses</h3>
            <div className="space-y-2">
              {propertyExpenses.map((e) => (
                <div key={e.id} className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium">{e.expenseType === "common" ? "Publique" : "Privée"}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.category} · ${e.amount}{e.apartmentNumber ? ` · Apt ${e.apartmentNumber}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{e.date?.slice(0, 10) ?? "-"}</p>
                  {e.comment?.trim() && (
                    <div className="mt-1">
                      <p className="text-xs font-medium text-foreground">Commentaire:</p>
                      <ExpandableText text={e.comment} />
                    </div>
                  )}
                </div>
              ))}
              {propertyExpenses.length === 0 && <p className="text-sm text-muted-foreground">Aucune dépense pour cette propriété.</p>}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

