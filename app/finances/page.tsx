"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { deleteExpenseApi, deletePaymentApi, updateExpenseApi, updatePaymentApi } from "@/lib/api";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace(/\/api$/, "");

export default function FinancesPage() {
  const { payments, expenses, houses, user, refresh } = useAppStore();
  const isManager = user?.role === "MANAGER";
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const editingPayment = payments.find((p) => p.id === editingPaymentId) ?? null;
  const editingExpense = expenses.find((e) => e.id === editingExpenseId) ?? null;

  // Snapshots for "unsaved changes" confirmation (similar to Propriétés modal UX)
  const [initialPaymentSnapshot, setInitialPaymentSnapshot] = useState<string>("");
  const [initialExpenseSnapshot, setInitialExpenseSnapshot] = useState<string>("");

  // Payment form state
  const [paymentMonth, setPaymentMonth] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [paymentFloor, setPaymentFloor] = useState<number>(1);
  const [paymentApartmentNumber, setPaymentApartmentNumber] = useState<number>(1);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentKind, setPaymentKind] = useState<"rental" | "monthly">("monthly");
  const [paymentTenantName, setPaymentTenantName] = useState<string>("");
  const [paymentMonthsCount, setPaymentMonthsCount] = useState<number>(1);

  // Expense form state
  const PRIVATE_CATEGORIES = [
    "Réparation électricité",
    "Réparation plomberie",
    "Peinture",
    "Réparation pavet",
    "Autre",
  ] as const;
  const COMMON_CATEGORIES = [
    "SNEL",
    "REGIDESO",
    "SECURITE",
    "GENERATEUR (GROUPE ELECTRONIQUE)",
    "IMMONDICE",
    "Autre",
  ] as const;

  const [expenseType, setExpenseType] = useState<"common" | "private">("common");
  const [expensePropertyLabel, setExpensePropertyLabel] = useState<string>("");
  const [expenseCategory, setExpenseCategory] = useState<string>("");
  const [expenseCustomCategory, setExpenseCustomCategory] = useState<string>("");
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseDate, setExpenseDate] = useState<string>("");
  const [expenseComment, setExpenseComment] = useState<string>("");
  const [expenseApartmentNumber, setExpenseApartmentNumber] = useState<string>("");

  function openPaymentEditor(id: string) {
    const p = payments.find((x) => x.id === id);
    if (!p) return;
    setEditingPaymentId(id);
    setPaymentMonth(p.month);
    setPaymentNotes(p.notes ?? "");
    setPaymentFloor(p.floor ?? 1);
    setPaymentApartmentNumber(p.apartmentNumber ?? 1);
    setPaymentAmount(String(p.amount));
    setPaymentKind(p.paymentKind ?? "monthly");
    setPaymentTenantName(p.tenantName ?? "");
    setPaymentMonthsCount(p.monthsCount ?? 1);
    setInitialPaymentSnapshot(
      JSON.stringify({
        month: p.month,
        monthsCount: p.monthsCount ?? 1,
        notes: p.notes ?? "",
        paymentKind: p.paymentKind ?? "monthly",
        tenantName: p.tenantName ?? "",
        floor: p.floor ?? 1,
        apartmentNumber: p.apartmentNumber ?? 1,
      })
    );
  }

  function openExpenseEditor(id: string) {
    const e = expenses.find((x) => x.id === id);
    if (!e) return;
    setEditingExpenseId(id);
    setExpenseType(e.expenseType);
    setExpensePropertyLabel(e.propertyLabel);
    // Category logic: if e.category matches a known option, preselect it.
    const list = e.expenseType === "private" ? PRIVATE_CATEGORIES : COMMON_CATEGORIES;
    const known = list.find((c) => c !== "Autre" && c === e.category);
    if (known) {
      setExpenseCategory(known);
      setExpenseCustomCategory("");
    } else if (list.includes("Autre" as any) && e.category && !list.some((c) => c === e.category)) {
      setExpenseCategory("Autre");
      setExpenseCustomCategory(e.category);
    } else if (e.category === "Autre") {
      setExpenseCategory("Autre");
      setExpenseCustomCategory("");
    } else {
      // Fallback when "Autre" is unavailable (e.g. common categories).
      const fallback = list[0];
      setExpenseCategory(fallback ?? "");
      setExpenseCustomCategory("");
    }
    setExpenseAmount(String(e.amount));
    setExpenseDate(e.date.slice(0, 10));
    setExpenseComment(e.comment ?? "");
    setExpenseApartmentNumber(e.apartmentNumber ?? "");
    setInitialExpenseSnapshot(
      JSON.stringify({
        expenseType: e.expenseType,
        category: e.category,
        amount: e.amount,
        date: e.date.slice(0, 10),
        comment: e.comment ?? "",
        apartmentNumber: e.apartmentNumber ?? "",
      })
    );
  }

  function closePaymentEditorWithConfirm() {
    if (!editingPaymentId) return;
    const current = JSON.stringify({
      month: paymentMonth,
      monthsCount: paymentMonthsCount,
      notes: paymentNotes,
      paymentKind,
      tenantName: paymentTenantName,
      floor: paymentFloor,
      apartmentNumber: paymentApartmentNumber,
    });
    if (initialPaymentSnapshot && initialPaymentSnapshot !== current) {
      const ok = window.confirm("Des modifications non sauvegardées seront perdues. Fermer ?");
      if (!ok) return;
    }
    setEditingPaymentId(null);
    setInitialPaymentSnapshot("");
  }

  function closeExpenseEditorWithConfirm() {
    if (!editingExpenseId) return;
    const current = JSON.stringify({
      expenseType,
      category: expenseCategory,
      customCategory: expenseCustomCategory,
      amount: expenseAmount,
      date: expenseDate,
      comment: expenseComment,
      apartmentNumber: expenseApartmentNumber,
    });
    if (initialExpenseSnapshot && initialExpenseSnapshot !== current) {
      const ok = window.confirm("Des modifications non sauvegardées seront perdues. Fermer ?");
      if (!ok) return;
    }
    setEditingExpenseId(null);
    setInitialExpenseSnapshot("");
  }

  async function savePayment() {
    if (!editingPaymentId || !editingPayment) return;
    const month = paymentMonth;
    if (paymentKind === "monthly" && !month) return toast.error("Mois requis.");
    if (paymentKind === "rental" && (!paymentMonthsCount || paymentMonthsCount < 1)) {
      return toast.error("Nombre de mois requis.");
    }

    if (editingPayment.propertyType === "house") {
      // Backend recalculates amount from house layout, so we send floor/apartment.
      await updatePaymentApi(editingPaymentId, {
        month: paymentKind === "monthly" ? month : undefined,
        monthsCount: paymentKind === "rental" ? paymentMonthsCount : undefined,
        notes: paymentNotes,
        paymentKind,
        tenantName: paymentTenantName,
        floor: paymentFloor,
        apartmentNumber: paymentApartmentNumber,
      });
    } else {
      const amt = Number(paymentAmount);
      if (!amt || amt <= 0) return toast.error("Montant invalide.");
      await updatePaymentApi(editingPaymentId, {
        month: paymentKind === "monthly" ? month : undefined,
        monthsCount: paymentKind === "rental" ? paymentMonthsCount : undefined,
        notes: paymentNotes,
        paymentKind,
        tenantName: paymentTenantName,
        amount: amt,
      });
    }
    await refresh();
    setEditingPaymentId(null);
    setInitialPaymentSnapshot("");
    toast.success("Entrée modifiée.");
  }

  async function saveExpense() {
    if (!editingExpenseId || !editingExpense) return;
    const amountNum = Number(expenseAmount);
    if (!expenseDate) return toast.error("Date requise.");
    if (!amountNum || amountNum <= 0) return toast.error("Montant invalide.");

    const categoryFinal = expenseCategory === "Autre" ? (expenseCustomCategory.trim() || expenseCustomCategory) : expenseCategory;
    if (!categoryFinal || categoryFinal.trim().length === 0) return toast.error("Catégorie requise.");
    if (expenseCategory === "Autre" && !expenseCustomCategory.trim()) return toast.error("Catégorie personnalisée requise.");

    const apartmentNumber = expenseType === "private" ? expenseApartmentNumber : undefined;

    await updateExpenseApi(editingExpenseId, {
      category: categoryFinal.trim(),
      amount: amountNum,
      date: expenseDate,
      comment: expenseComment,
      apartmentNumber: apartmentNumber && apartmentNumber.trim() ? apartmentNumber : undefined,
    });

    await refresh();
    setEditingExpenseId(null);
    setInitialExpenseSnapshot("");
    toast.success("Sortie modifiée.");
  }

  return (
    <DashboardLayout title="Finances" description="Entrées et sorties détaillées">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Entrées (Loyers)</h3>
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{p.propertyLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.paymentKind === "rental" ? `${p.monthsCount ?? 1} mois` : p.month} · ${p.amount} · {p.paymentKind === "rental" ? "Loyer locatif" : "Paiement mensuel"}
                      {(p.propertyType === "house" || p.propertyType === "building") && p.apartmentNumber ? ` · Niveau ${p.floor ?? "-"} / Apt ${p.apartmentNumber}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">Locataire: {p.tenantName || "-"}</p>
                    {p.contractFileUrl && (
                      <a
                        href={`${API_ORIGIN}${p.contractFileUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline"
                      >
                        Voir le contrat PDF
                      </a>
                    )}
                  </div>
                  {isManager && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPaymentEditor(p.id)}
                      >
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          if (!window.confirm("Supprimer cette entrée ?")) return;
                          await deletePaymentApi(p.id);
                          await refresh();
                          toast.success("Entrée supprimée.");
                        }}
                      >
                        Supprimer
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {payments.length === 0 && <p className="text-sm text-muted-foreground">Aucune entrée.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Sorties (Dépenses)</h3>
          <div className="space-y-2">
            {expenses.map((e) => (
              <div key={e.id} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{e.propertyLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.expenseType === "common" ? "Publique" : "Privée"} · {e.category} · ${e.amount}
                      {e.apartmentNumber ? ` · Apt ${e.apartmentNumber}` : ""}
                    </p>
                  </div>
                  {isManager && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openExpenseEditor(e.id)}
                      >
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          if (!window.confirm("Supprimer cette sortie ?")) return;
                          await deleteExpenseApi(e.id);
                          await refresh();
                          toast.success("Sortie supprimée.");
                        }}
                      >
                        Supprimer
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {expenses.length === 0 && <p className="text-sm text-muted-foreground">Aucune sortie.</p>}
          </div>
        </div>
      </div>

      {/* Payment editor */}
      <Dialog open={Boolean(editingPayment)} onOpenChange={(v) => !v && closePaymentEditorWithConfirm()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier entrée</DialogTitle>
            <DialogDescription>{editingPayment?.propertyLabel}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {paymentKind === "monthly" ? (
              <div className="space-y-2">
                <Label>Mois (YYYY-MM)</Label>
                <Input value={paymentMonth} onChange={(e) => setPaymentMonth(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Nombre de mois</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={paymentMonthsCount}
                  onChange={(e) => setPaymentMonthsCount(Math.max(1, Number(e.target.value || 1)))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type de paiement</Label>
                <Select value={paymentKind} onValueChange={(v) => setPaymentKind(v as "rental" | "monthly")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rental">Loyer locatif</SelectItem>
                    <SelectItem value="monthly">Paiement mensuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nom du locataire</Label>
                <Input value={paymentTenantName} onChange={(e) => setPaymentTenantName(e.target.value)} />
              </div>
            </div>

            {editingPayment?.propertyType === "house" || editingPayment?.propertyType === "building" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Niveau</Label>
                  <Input type="number" min={1} step={1} value={paymentFloor} onChange={(e) => setPaymentFloor(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Appartement</Label>
                  <Input type="number" min={1} step={1} value={paymentApartmentNumber} onChange={(e) => setPaymentApartmentNumber(Number(e.target.value))} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Montant (calculé)</Label>
                  <Input
                    type="number"
                    readOnly
                    value={(() => {
                      const house = houses.find((h) => h.id === editingPayment.propertyId);
                      const level = house?.layout?.find((l) => l.floor === paymentFloor);
                      const apt = level?.apartments?.find((a) => a.number === paymentApartmentNumber);
                      const value = apt?.rentPrice ?? editingPayment.amount;
                      return String(value ?? 0);
                    })()}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Montant (studio)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closePaymentEditorWithConfirm}>
              Annuler
            </Button>
            <Button
              onClick={async () => {
                try {
                  await savePayment();
                } catch (e2) {
                  toast.error(e2 instanceof Error ? e2.message : "Erreur");
                }
              }}
              disabled={!isManager}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense editor */}
      <Dialog open={Boolean(editingExpense)} onOpenChange={(v) => !v && closeExpenseEditorWithConfirm()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier sortie</DialogTitle>
            <DialogDescription>{editingExpense?.propertyLabel}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label>Type</Label>
                <Select value={expenseType} onValueChange={(v) => setExpenseType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="common">Publique</SelectItem>
                    <SelectItem value="private">Privée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {expenseType === "private" && (
                <div className="w-44">
                  <Label>Appartement</Label>
                  <Input value={expenseApartmentNumber} onChange={(e) => setExpenseApartmentNumber(e.target.value)} placeholder="Ex: 3B" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Montant</Label>
                <Input type="number" min={0} step="0.01" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={expenseCategory} onValueChange={(v) => setExpenseCategory(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(expenseType === "private" ? PRIVATE_CATEGORIES : COMMON_CATEGORIES).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {expenseCategory === "Autre" && (
                <div className="space-y-2 pt-2">
                  <Label>Catégorie personnalisée</Label>
                  <Input value={expenseCustomCategory} onChange={(e) => setExpenseCustomCategory(e.target.value)} placeholder="Saisir catégorie..." />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Commentaire</Label>
              <Textarea rows={3} value={expenseComment} onChange={(e) => setExpenseComment(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeExpenseEditorWithConfirm}>
              Annuler
            </Button>
            <Button onClick={saveExpense} disabled={!isManager}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
