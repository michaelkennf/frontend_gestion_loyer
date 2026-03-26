"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { deleteHouseApi, deleteStudioApi, updateHouseApi, updateStudioApi } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PropertiesPage() {
  const { houses, studios, user, refresh } = useAppStore();
  const isManager = user?.role === "MANAGER";
  const [editingHouseId, setEditingHouseId] = useState<string | null>(null);
  const [editingStudioId, setEditingStudioId] = useState<string | null>(null);
  const [houseAddress, setHouseAddress] = useState("");
  const [levels, setLevels] = useState<{ floor: number; apartments: { number: number; rentPrice: number | null }[] }[]>([]);
  const [studioAddress, setStudioAddress] = useState("");
  const [studioRent, setStudioRent] = useState<string>("");
  const [initialHouseSnapshot, setInitialHouseSnapshot] = useState("");
  const [initialStudioSnapshot, setInitialStudioSnapshot] = useState("");

  const editingHouse = houses.find((h) => h.id === editingHouseId) ?? null;
  const editingStudio = studios.find((s) => s.id === editingStudioId) ?? null;

  function openHouseEditor(houseId: string) {
    const h = houses.find((x) => x.id === houseId);
    if (!h) return;
    setEditingHouseId(houseId);
    setHouseAddress(h.address);
    setLevels(
      (h.layout ?? []).map((lvl) => ({
        floor: lvl.floor,
        apartments: lvl.apartments.map((a) => ({ number: a.number, rentPrice: a.rentPrice })),
      }))
    );
    setInitialHouseSnapshot(JSON.stringify({ address: h.address, levels: h.layout ?? [] }));
  }

  function openStudioEditor(studioId: string) {
    const s = studios.find((x) => x.id === studioId);
    if (!s) return;
    setEditingStudioId(studioId);
    setStudioAddress(s.address);
    setStudioRent(String(s.monthlyRent));
    setInitialStudioSnapshot(JSON.stringify({ address: s.address, monthlyRent: s.monthlyRent }));
  }

  async function saveHouse() {
    if (!editingHouseId) return;
    if (!houseAddress.trim()) return toast.error("Adresse requise.");
    if (levels.length < 1) return toast.error("Ajoute au moins un niveau.");
    if (levels.some((l) => l.apartments.length < 1 || l.apartments.some((a) => !a.rentPrice || a.rentPrice <= 0))) {
      return toast.error("Chaque appartement doit avoir un loyer valide.");
    }
    await updateHouseApi(editingHouseId, {
      address: houseAddress.trim(),
      levels: levels.map((l) => ({
        floor: l.floor,
        apartments: l.apartments.map((a) => ({ number: a.number, rentPrice: a.rentPrice ?? 0 })),
      })),
    });
    await refresh();
    setEditingHouseId(null);
    setInitialHouseSnapshot("");
    toast.success("Maison mise à jour.");
  }

  async function saveStudio() {
    if (!editingStudioId) return;
    const monthlyRent = Number(studioRent);
    if (!studioAddress.trim() || !monthlyRent || monthlyRent <= 0) return toast.error("Champs studio invalides.");
    await updateStudioApi(editingStudioId, { address: studioAddress.trim(), monthlyRent });
    await refresh();
    setEditingStudioId(null);
    setInitialStudioSnapshot("");
    toast.success("Studio mis à jour.");
  }

  function closeHouseEditorWithConfirm() {
    const current = JSON.stringify({
      address: houseAddress.trim(),
      levels: levels.map((l) => ({
        floor: l.floor,
        apartments: l.apartments.map((a) => ({ number: a.number, rentPrice: a.rentPrice ?? null })),
      })),
    });
    if (initialHouseSnapshot && initialHouseSnapshot !== current) {
      const ok = window.confirm("Des modifications non sauvegardées seront perdues. Fermer ?");
      if (!ok) return;
    }
    setEditingHouseId(null);
    setInitialHouseSnapshot("");
  }

  function closeStudioEditorWithConfirm() {
    const current = JSON.stringify({
      address: studioAddress.trim(),
      monthlyRent: Number(studioRent),
    });
    if (initialStudioSnapshot && initialStudioSnapshot !== current) {
      const ok = window.confirm("Des modifications non sauvegardées seront perdues. Fermer ?");
      if (!ok) return;
    }
    setEditingStudioId(null);
    setInitialStudioSnapshot("");
  }

  return (
    <DashboardLayout title="Propriétés" description="Liste complète des maisons et studios">
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Maisons</h3>
          <div className="space-y-3">
            {houses.map((h) => (
              <div key={h.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">{h.address}</p>
                    <p className="text-xs text-muted-foreground">{h.floors} niveaux · {h.apartments} appartements</p>
                  </div>
                  {isManager && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openHouseEditor(h.id)}
                      >
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          if (!window.confirm("Supprimer cette maison ?")) return;
                          await deleteHouseApi(h.id);
                          await refresh();
                          toast.success("Maison supprimée.");
                        }}
                      >
                        Supprimer
                      </Button>
                    </div>
                  )}
                </div>
                <div className="mt-3 space-y-2">
                  {h.layout?.map((lvl) => (
                    <div key={`${h.id}-${lvl.floor}`} className="rounded-md bg-muted/40 p-2">
                      <p className="text-xs font-medium">Niveau {lvl.floor}</p>
                      <p className="text-xs text-muted-foreground">
                        {lvl.apartments.map((a) => `Apt ${a.number}: $${a.rentPrice}`).join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {houses.length === 0 && <p className="text-sm text-muted-foreground">Aucune maison enregistrée.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Studios</h3>
          <div className="space-y-3">
            {studios.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-semibold">{s.address}</p>
                  <p className="text-xs text-muted-foreground">Loyer mensuel: ${s.monthlyRent}</p>
                </div>
                {isManager && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openStudioEditor(s.id)}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        if (!window.confirm("Supprimer ce studio ?")) return;
                        await deleteStudioApi(s.id);
                        await refresh();
                        toast.success("Studio supprimé.");
                      }}
                    >
                      Supprimer
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {studios.length === 0 && <p className="text-sm text-muted-foreground">Aucun studio enregistré.</p>}
          </div>
        </div>
      </div>

      <Dialog open={Boolean(editingHouse)} onOpenChange={(v) => !v && closeHouseEditorWithConfirm()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier maison</DialogTitle>
            <DialogDescription>Mettre à jour l'adresse, niveaux, appartements et loyers.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input value={houseAddress} onChange={(e) => setHouseAddress(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLevels((prev) => [...prev, { floor: prev.length + 1, apartments: [{ number: 1, rentPrice: null }] }])}
              >
                Ajouter niveau
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={levels.length === 0}
                onClick={() =>
                  setLevels((prev) => {
                    if (prev.length === 0) return prev;
                    const last = prev[prev.length - 1];
                    const duplicated = {
                      floor: prev.length + 1,
                      apartments: last.apartments.map((a, i) => ({ number: i + 1, rentPrice: a.rentPrice })),
                    };
                    return [...prev, duplicated];
                  })
                }
              >
                Dupliquer niveau
              </Button>
            </div>

            {levels.map((lvl, lvlIdx) => (
              <div key={`edit-lvl-${lvl.floor}`} className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Niveau {lvl.floor}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLevels((prev) => prev.filter((_, i) => i !== lvlIdx).map((l, i) => ({ ...l, floor: i + 1 })))}
                  >
                    Retirer niveau
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setLevels((prev) =>
                      prev.map((l, i) =>
                        i === lvlIdx
                          ? { ...l, apartments: [...l.apartments, { number: l.apartments.length + 1, rentPrice: null }] }
                          : l
                      )
                    )
                  }
                >
                  Ajouter appartement
                </Button>
                {lvl.apartments.map((apt, aptIdx) => (
                  <div key={`apt-${lvl.floor}-${apt.number}`} className="grid grid-cols-[1fr_auto] gap-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={apt.rentPrice ?? ""}
                      placeholder={`Loyer appartement ${apt.number}`}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setLevels((prev) =>
                          prev.map((l, i) =>
                            i === lvlIdx
                              ? {
                                  ...l,
                                  apartments: l.apartments.map((a, ai) => (ai === aptIdx ? { ...a, rentPrice: raw === "" ? null : Number(raw) } : a)),
                                }
                              : l
                          )
                        );
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setLevels((prev) =>
                          prev.map((l, i) =>
                            i === lvlIdx
                              ? { ...l, apartments: l.apartments.filter((_, ai) => ai !== aptIdx).map((a, k) => ({ ...a, number: k + 1 })) }
                              : l
                          )
                        )
                      }
                    >
                      Retirer
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeHouseEditorWithConfirm}>Annuler</Button>
            <Button onClick={saveHouse}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingStudio)} onOpenChange={(v) => !v && closeStudioEditorWithConfirm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier studio</DialogTitle>
            <DialogDescription>Mettre à jour les informations du studio.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input value={studioAddress} onChange={(e) => setStudioAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Loyer mensuel</Label>
              <Input type="number" min={0} step="0.01" value={studioRent} onChange={(e) => setStudioRent(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeStudioEditorWithConfirm}>Annuler</Button>
            <Button onClick={saveStudio}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
