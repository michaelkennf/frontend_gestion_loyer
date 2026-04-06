"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { deleteSupplierApi, updateSupplierApi } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SuppliersPage() {
  const { suppliers, user, refresh } = useAppStore();
  const isManager = user?.role === "MANAGER";

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");

  const editing = suppliers.find((s) => s.id === editingId) ?? null;

  function openEdit(id: string) {
    const s = suppliers.find((x) => x.id === id);
    if (!s) return;
    setEditingId(id);
    setEditName(s.name);
    setEditContact(s.contact);
  }

  async function saveEdit() {
    if (!editingId) return;
    const name = editName.trim();
    const contact = editContact.trim();
    if (!name || !contact) return toast.error("Nom et contact requis.");
    try {
      await updateSupplierApi(editingId, { name, contact });
      await refresh();
      setEditingId(null);
      toast.success("Fournisseur mis à jour.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Supprimer ce fournisseur ? Les dépenses liées perdront la référence fournisseur.")) return;
    try {
      await deleteSupplierApi(id);
      await refresh();
      toast.success("Fournisseur supprimé.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <DashboardLayout
      title="Fournisseurs"
      description="Liste, modification et suppression des fournisseurs"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Utilisés pour les dépenses communes (hors terrain).
        </p>
        {isManager && (
          <Button asChild>
            <Link href="/add-supplier">Ajouter un fournisseur</Link>
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="divide-y divide-border">
          {suppliers.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">Aucun fournisseur enregistré.</p>
          )}
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-foreground">{s.name}</p>
                <p className="text-sm text-muted-foreground">{s.contact}</p>
              </div>
              {isManager && (
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => openEdit(s.id)}>
                    Modifier
                  </Button>
                  <Button type="button" size="sm" variant="destructive" onClick={() => remove(s.id)}>
                    Supprimer
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(v) => !v && setEditingId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le fournisseur</DialogTitle>
            <DialogDescription>{editing?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nom</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contact">Contact</Label>
              <Input id="edit-contact" value={editContact} onChange={(e) => setEditContact(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
              Annuler
            </Button>
            <Button type="button" onClick={saveEdit}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
