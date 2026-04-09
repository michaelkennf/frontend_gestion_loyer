"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { floorDisplayLabel } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-CD", { style: "currency", currency: "USD" }).format(amount);
}

export default function RentalDepositsPage() {
  const { rentalDeposits, user, deleteRentalDeposit, debitRentalDeposit } = useAppStore();
  const isManager = user?.role === "MANAGER";

  const total = rentalDeposits.reduce((s, r) => s + (r.balance ?? 0), 0);
  const [search, setSearch] = useState("");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<"all" | "house" | "building" | "studio" | "land">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rentalDeposits.find((r) => r.id === selectedId) ?? null;
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundComment, setRefundComment] = useState<string>("");

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseDepositId, setExpenseDepositId] = useState<string>("");
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseComment, setExpenseComment] = useState<string>("");

  const q = search.trim().toLowerCase();
  const filteredDeposits = rentalDeposits
    .filter((r) => (propertyTypeFilter === "all" ? true : r.propertyType === propertyTypeFilter))
    .filter((r) => {
      if (!q) return true;
      const hay = `${r.propertyLabel} ${r.tenantName} ${r.notes ?? ""}`.toLowerCase();
      return hay.includes(q);
    });

  async function submitRefund() {
    if (!selected) return;
    const amt = Number(refundAmount);
    if (!amt || amt <= 0) return toast.error("Montant invalide.");
    await debitRentalDeposit({ id: selected.id, kind: "refund", amount: amt, comment: refundComment.trim() || undefined });
    toast.success("Remise enregistrée.");
    setSelectedId(null);
    setRefundAmount("");
    setRefundComment("");
  }

  async function submitExpense() {
    if (!expenseDepositId) return toast.error("Sélectionnez une garantie.");
    const amt = Number(expenseAmount);
    if (!amt || amt <= 0) return toast.error("Montant invalide.");
    await debitRentalDeposit({ id: expenseDepositId, kind: "expense", amount: amt, comment: expenseComment.trim() || undefined });
    toast.success("Dépense enregistrée sur la garantie.");
    setExpenseOpen(false);
    setExpenseDepositId("");
    setExpenseAmount("");
    setExpenseComment("");
  }

  return (
    <DashboardLayout title="Garantie locative" description="Liste des garanties par propriété (et appartement si applicable)">
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Recherche (propriété / locataire)</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ex: Avenue, Locataire..." />
            </div>
            <div className="space-y-2">
              <Label>Type de propriété</Label>
              <Select value={propertyTypeFilter} onValueChange={(v) => setPropertyTypeFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="house">Maison</SelectItem>
                  <SelectItem value="building">Immeuble</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="land">Terrain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="hidden lg:block" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Solde total</p>
              <p className="text-2xl font-bold">{formatCurrency(total)}</p>
              <p className="text-xs text-muted-foreground">{rentalDeposits.length} enregistrement(s)</p>
            </div>
            {isManager && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Link href="/register-rental-deposit">
                  <Button>Ajouter / Mettre à jour</Button>
                </Link>
                <Button variant="outline" onClick={() => setExpenseOpen(true)}>
                  Dépense
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Liste</h3>
          <div className="space-y-3">
            {filteredDeposits.map((r) => (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(r.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedId(r.id);
                }}
                className="rounded-lg border border-border p-4 cursor-pointer transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">{r.propertyLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.propertyType === "building"
                        ? "Immeuble"
                        : r.propertyType === "house"
                          ? "Maison"
                          : r.propertyType === "studio"
                            ? "Studio"
                            : "Terrain"}
                      {typeof r.floor === "number" && r.apartmentNumber
                        ? ` · ${floorDisplayLabel(r.floor)} / Apt ${r.apartmentNumber}`
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">Locataire: {r.tenantName}</p>
                    {r.notes && <p className="text-xs text-muted-foreground">Note: {r.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(r.balance)}</p>
                    <p className="text-xs text-muted-foreground">Maj: {r.updatedAt.slice(0, 10)}</p>
                    {isManager && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="mt-2"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm("Supprimer cette garantie locative ?")) return;
                          await deleteRentalDeposit(r.id);
                          toast.success("Garantie supprimée.");
                        }}
                      >
                        Supprimer
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredDeposits.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune garantie enregistrée.</p>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(v) => {
          if (!v) {
            setSelectedId(null);
            setRefundAmount("");
            setRefundComment("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Garantie locative</DialogTitle>
            <DialogDescription>
              {selected?.propertyLabel}
              {selected && typeof selected.floor === "number" && selected.apartmentNumber
                ? ` · ${floorDisplayLabel(selected.floor)} / Apt ${selected.apartmentNumber}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Solde actuel</p>
              <p className="text-lg font-semibold">{formatCurrency(selected?.balance ?? 0)}</p>
            </div>

            {isManager && (
              <>
                <div className="space-y-2">
                  <Label>Montant</Label>
                  <Input type="number" min={0.01} step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Motif / commentaire</Label>
                  <Textarea value={refundComment} onChange={(e) => setRefundComment(e.target.value)} placeholder="Ex: remise au locataire, ..." />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedId(null)}>Fermer</Button>
            {isManager && <Button onClick={submitRefund}>Valider la remise</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={expenseOpen}
        onOpenChange={(v) => {
          if (!v) {
            setExpenseOpen(false);
            setExpenseDepositId("");
            setExpenseAmount("");
            setExpenseComment("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Dépense (sur garantie locative)</DialogTitle>
            <DialogDescription>
              Cette dépense est soustraite du solde de la garantie locative (indépendant des loyers et des dépenses classiques).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Garantie</Label>
              <Select value={expenseDepositId} onValueChange={setExpenseDepositId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une garantie…" />
                </SelectTrigger>
                <SelectContent>
                  {rentalDeposits.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.propertyLabel}
                      {typeof r.floor === "number" && r.apartmentNumber ? ` · ${floorDisplayLabel(r.floor)} / Apt ${r.apartmentNumber}` : ""}
                      {` · ${formatCurrency(r.balance)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Montant</Label>
              <Input type="number" min={0.01} step="0.01" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Motif / commentaire</Label>
              <Textarea value={expenseComment} onChange={(e) => setExpenseComment(e.target.value)} placeholder="Ex: réparation, achat matériel, ..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseOpen(false)}>Annuler</Button>
            <Button onClick={submitExpense}>Valider la dépense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

