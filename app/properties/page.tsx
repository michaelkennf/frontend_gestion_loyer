"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAppStore, type House } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { deleteHouseApi, deleteLandApi, deleteStudioApi, updateHouseApi, updateLandApi, updateStudioApi } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { floorDisplayLabel } from "@/lib/utils";

function HousePropertyCard({
  h,
  isManager,
  kind,
  onEdit,
  onDeleted,
}: {
  h: House;
  isManager: boolean;
  kind: "maison" | "immeuble";
  onEdit: () => void;
  onDeleted: () => Promise<void>;
}) {
  const confirmDelete = kind === "maison" ? "Supprimer cette maison ?" : "Supprimer cet immeuble ?";
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">{h.address}</p>
          <p className="text-xs text-muted-foreground">{h.floors} niveaux · {h.apartments} appartements</p>
        </div>
        {isManager && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onEdit}>
              Modifier
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                if (!window.confirm(confirmDelete)) return;
                await onDeleted();
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
            <p className="text-xs font-medium">{floorDisplayLabel(lvl.floor)}</p>
            <p className="text-xs text-muted-foreground">
              {lvl.apartments.map((a) => `Apt ${a.number}: $${a.rentPrice}`).join(" · ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  const { houses, studios, lands, user, refresh } = useAppStore();
  const isManager = user?.role === "MANAGER";
  const [editingHouseId, setEditingHouseId] = useState<string | null>(null);
  const [editingStudioId, setEditingStudioId] = useState<string | null>(null);
  const [editingLandId, setEditingLandId] = useState<string | null>(null);
  const [houseAddress, setHouseAddress] = useState("");
  const [levels, setLevels] = useState<{ floor: number; apartments: { number: number; rentPrice: number | null }[] }[]>([]);
  const [studioAddress, setStudioAddress] = useState("");
  const [studioRent, setStudioRent] = useState<string>("");
  const [landAddress, setLandAddress] = useState("");
  const [landSize, setLandSize] = useState<string>("");
  const [landMonthlyRent, setLandMonthlyRent] = useState<string>("");
  const [initialHouseSnapshot, setInitialHouseSnapshot] = useState("");
  const [initialStudioSnapshot, setInitialStudioSnapshot] = useState("");
  const [initialLandSnapshot, setInitialLandSnapshot] = useState("");

  const editingHouse = houses.find((h) => h.id === editingHouseId) ?? null;
  const maisons = houses.filter((h) => !h.isBuilding);
  const immeubles = houses.filter((h) => h.isBuilding);
  const editingStudio = studios.find((s) => s.id === editingStudioId) ?? null;
  const editingLand = lands.find((l) => l.id === editingLandId) ?? null;

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

  function openLandEditor(landId: string) {
    const l = lands.find((x) => x.id === landId);
    if (!l) return;
    setEditingLandId(landId);
    setLandAddress(l.address);
    setLandSize(String(l.size));
    setLandMonthlyRent(String(l.monthlyRent));
    setInitialLandSnapshot(JSON.stringify({ address: l.address, size: l.size, monthlyRent: l.monthlyRent }));
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
    toast.success(editingHouse?.isBuilding ? "Immeuble mis à jour." : "Maison mise à jour.");
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

  async function saveLand() {
    if (!editingLandId) return;
    const size = Number(landSize);
    const monthlyRent = Number(landMonthlyRent);
    if (!landAddress.trim() || !size || size <= 0 || !monthlyRent || monthlyRent <= 0) {
      return toast.error("Adresse, superficie et prix de location requis.");
    }
    await updateLandApi(editingLandId, { address: landAddress.trim(), size, monthlyRent });
    await refresh();
    setEditingLandId(null);
    setInitialLandSnapshot("");
    toast.success("Terrain mis à jour.");
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

  function closeLandEditorWithConfirm() {
    const current = JSON.stringify({
      address: landAddress.trim(),
      size: Number(landSize),
      monthlyRent: Number(landMonthlyRent),
    });
    if (initialLandSnapshot && initialLandSnapshot !== current) {
      const ok = window.confirm("Des modifications non sauvegardées seront perdues. Fermer ?");
      if (!ok) return;
    }
    setEditingLandId(null);
    setInitialLandSnapshot("");
  }

  return (
    <DashboardLayout title="Propriétés" description="Maisons, immeubles, studios et terrains">
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Maisons</h3>
          <div className="space-y-3">
            {maisons.map((h) => (
              <HousePropertyCard
                key={h.id}
                h={h}
                isManager={isManager}
                kind="maison"
                onEdit={() => openHouseEditor(h.id)}
                onDeleted={async () => {
                  await deleteHouseApi(h.id);
                  await refresh();
                  toast.success("Maison supprimée.");
                }}
              />
            ))}
            {maisons.length === 0 && <p className="text-sm text-muted-foreground">Aucune maison enregistrée.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Immeubles</h3>
          <div className="space-y-3">
            {immeubles.map((h) => (
              <HousePropertyCard
                key={h.id}
                h={h}
                isManager={isManager}
                kind="immeuble"
                onEdit={() => openHouseEditor(h.id)}
                onDeleted={async () => {
                  await deleteHouseApi(h.id);
                  await refresh();
                  toast.success("Immeuble supprimé.");
                }}
              />
            ))}
            {immeubles.length === 0 && <p className="text-sm text-muted-foreground">Aucun immeuble enregistré.</p>}
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

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Terrains</h3>
          <div className="space-y-3">
            {lands.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-semibold">{l.address}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.size} m² · Loyer : ${l.monthlyRent}/mois
                  </p>
                </div>
                {isManager && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openLandEditor(l.id)}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        if (!window.confirm("Supprimer ce terrain ?")) return;
                        await deleteLandApi(l.id);
                        await refresh();
                        toast.success("Terrain supprimé.");
                      }}
                    >
                      Supprimer
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {lands.length === 0 && <p className="text-sm text-muted-foreground">Aucun terrain enregistré.</p>}
          </div>
        </div>
      </div>

      <Dialog open={Boolean(editingHouse)} onOpenChange={(v) => !v && closeHouseEditorWithConfirm()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingHouse?.isBuilding ? "Modifier immeuble" : "Modifier maison"}</DialogTitle>
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
                  <p className="text-sm font-semibold">{floorDisplayLabel(lvl.floor)}</p>
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

      <Dialog open={Boolean(editingLand)} onOpenChange={(v) => !v && closeLandEditorWithConfirm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier terrain</DialogTitle>
            <DialogDescription>Adresse, superficie et prix de location.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input value={landAddress} onChange={(e) => setLandAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Superficie (m²)</Label>
              <Input type="number" min={0.01} step="0.01" value={landSize} onChange={(e) => setLandSize(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Prix de location ($ / mois)</Label>
              <Input type="number" min={0.01} step="0.01" value={landMonthlyRent} onChange={(e) => setLandMonthlyRent(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeLandEditorWithConfirm}>Annuler</Button>
            <Button onClick={saveLand}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
