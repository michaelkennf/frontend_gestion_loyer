"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAppStore } from "@/lib/store";
import { floorDisplayLabel } from "@/lib/utils";

function monthLabel(month: string) {
  return month && /^\d{4}-\d{2}$/.test(month) ? month : "-";
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

