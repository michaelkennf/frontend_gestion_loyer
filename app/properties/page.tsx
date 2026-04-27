"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type OverdueUnit = {
  key: string;
  label: string;
  lastCoveredMonth: string;
  dueMonth: string;
  monthsLate: number;
};

function monthToIndex(month: string): number | null {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [y, m] = month.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  return y * 12 + (m - 1);
}

function currentMonthIndex(): number {
  const d = new Date();
  return d.getFullYear() * 12 + d.getMonth();
}

function monthIndexToLabel(index: number | null): string {
  if (index === null) return "Aucun paiement";
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getHouseOverdueUnits(
  h: House,
  payments: Array<{ propertyId: string; month: string; paymentKind: "rental" | "monthly"; monthsCount?: number | null; floor?: number | null; apartmentNumber?: number | null }>,
  nowMonth: number,
): OverdueUnit[] {
  const layout = h.layout ?? [];
  const apts = layout.flatMap((lvl) => lvl.apartments.map((a) => ({ floor: lvl.floor, apartmentNumber: a.number })));
  const housePayments = payments.filter((p) => p.propertyId === h.id);

  return apts
    .map(({ floor, apartmentNumber }) => {
      const aptPayments = housePayments.filter((p) => p.floor === floor && p.apartmentNumber === apartmentNumber);
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
        key: `${h.id}:${floor}:${apartmentNumber}`,
        label: `${floorDisplayLabel(floor)} · Apt ${apartmentNumber}`,
        lastCoveredMonth: monthIndexToLabel(maxCovered),
        dueMonth: monthIndexToLabel(dueMonth),
        monthsLate: Math.max(1, nowMonth - dueMonth + 1),
      } as OverdueUnit;
    })
    .filter((u): u is OverdueUnit => Boolean(u));
}

function getSimpleOverdueUnits(
  propertyId: string,
  label: string,
  payments: Array<{ propertyId: string; month: string; paymentKind: "rental" | "monthly"; monthsCount?: number | null }>,
  nowMonth: number,
): OverdueUnit[] {
  const ps = payments.filter((p) => p.propertyId === propertyId);
  let maxCovered: number | null = null;
  for (const p of ps) {
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
      key: propertyId,
      label,
      lastCoveredMonth: monthIndexToLabel(maxCovered),
      dueMonth: monthIndexToLabel(dueMonth),
      monthsLate: Math.max(1, nowMonth - dueMonth + 1),
    },
  ];
}

function HousePropertyCard({
  h,
  isManager,
  kind,
  isOverdue,
  onEdit,
  onDeleted,
  onOpenDetails,
}: {
  h: House;
  isManager: boolean;
  kind: "maison" | "immeuble";
  isOverdue: boolean;
  onEdit: () => void;
  onDeleted: () => Promise<void>;
  onOpenDetails: () => void;
}) {
  const confirmDelete = kind === "maison" ? "Supprimer cette maison ?" : "Supprimer cet immeuble ?";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenDetails}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpenDetails();
      }}
      className={[
        "rounded-lg border p-4 cursor-pointer transition-colors",
        isOverdue ? "border-destructive/60 bg-destructive/5" : "border-border hover:bg-muted/30",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={["text-sm font-semibold", isOverdue ? "text-destructive" : ""].join(" ")}>{h.address}</p>
          <p className="text-xs text-muted-foreground">{h.floors} niveaux · {h.apartments} appartements</p>
          {isOverdue && <p className="mt-1 text-xs font-medium text-destructive">Retard de paiement</p>}
        </div>
        {isManager && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              Modifier
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={async (e) => {
                e.stopPropagation();
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
  const router = useRouter();
  const { houses, studios, lands, payments, user, refresh } = useAppStore();
  const isManager = user?.role === "MANAGER";
  const [searchAddress, setSearchAddress] = useState("");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<"all" | "house" | "building" | "studio" | "land">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "overdue" | "ok">("all");
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
  const houseBaseFloor = editingHouse?.isBuilding ? 0 : 1;

  function renumberLevels(
    prev: { floor: number; apartments: { number: number; rentPrice: number | null }[] }[],
    baseFloor: number
  ) {
    return prev.map((l, idx) => ({ ...l, floor: baseFloor + idx }));
  }

  const nowMonth = currentMonthIndex();
  const houseOverdueMap = new Map(houses.map((h) => [h.id, getHouseOverdueUnits(h, payments, nowMonth)]));
  const studioOverdueMap = new Map(studios.map((s) => [s.id, getSimpleOverdueUnits(s.id, "Studio", payments, nowMonth)]));
  const landOverdueMap = new Map(lands.map((l) => [l.id, getSimpleOverdueUnits(l.id, "Terrain", payments, nowMonth)]));

  function houseIsOverdue(h: House): boolean {
    return (houseOverdueMap.get(h.id)?.length ?? 0) > 0;
  }

  function simplePropertyIsOverdue(propertyId: string): boolean {
    return (studioOverdueMap.get(propertyId)?.length ?? 0) > 0 || (landOverdueMap.get(propertyId)?.length ?? 0) > 0;
  }

  const q = searchAddress.trim().toLowerCase();
  const maisonsFiltered = maisons
    .filter((h) => (propertyTypeFilter === "all" ? true : propertyTypeFilter === "house"))
    .filter((h) => (q ? h.address.toLowerCase().includes(q) : true))
    .filter((h) => {
      const overdue = houseIsOverdue(h);
      return statusFilter === "all" ? true : statusFilter === "overdue" ? overdue : !overdue;
    });
  const immeublesFiltered = immeubles
    .filter((h) => (propertyTypeFilter === "all" ? true : propertyTypeFilter === "building"))
    .filter((h) => (q ? h.address.toLowerCase().includes(q) : true))
    .filter((h) => {
      const overdue = houseIsOverdue(h);
      return statusFilter === "all" ? true : statusFilter === "overdue" ? overdue : !overdue;
    });
  const studiosFiltered = studios
    .filter((s) => (propertyTypeFilter === "all" ? true : propertyTypeFilter === "studio"))
    .filter((s) => (q ? s.address.toLowerCase().includes(q) : true))
    .filter((s) => {
      const overdue = simplePropertyIsOverdue(s.id);
      return statusFilter === "all" ? true : statusFilter === "overdue" ? overdue : !overdue;
    });
  const landsFiltered = lands
    .filter((l) => (propertyTypeFilter === "all" ? true : propertyTypeFilter === "land"))
    .filter((l) => (q ? l.address.toLowerCase().includes(q) : true))
    .filter((l) => {
      const overdue = simplePropertyIsOverdue(l.id);
      return statusFilter === "all" ? true : statusFilter === "overdue" ? overdue : !overdue;
    });

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
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Recherche (adresse)</Label>
              <Input value={searchAddress} onChange={(e) => setSearchAddress(e.target.value)} placeholder="Rechercher par adresse" />
            </div>
            <div className="space-y-2">
              <Label>Type de propriété</Label>
              <Select value={propertyTypeFilter} onValueChange={(v) => setPropertyTypeFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="house">Maisons</SelectItem>
                  <SelectItem value="building">Immeubles</SelectItem>
                  <SelectItem value="studio">Studios</SelectItem>
                  <SelectItem value="land">Terrains</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statut paiement</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="overdue">En retard</SelectItem>
                  <SelectItem value="ok">À jour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Maisons</h3>
          <div className="space-y-3">
            {maisonsFiltered.map((h) => (
              <HousePropertyCard
                key={h.id}
                h={h}
                isManager={isManager}
                kind="maison"
                isOverdue={houseIsOverdue(h)}
                onEdit={() => openHouseEditor(h.id)}
                onDeleted={async () => {
                  await deleteHouseApi(h.id);
                  await refresh();
                  toast.success("Maison supprimée.");
                }}
                onOpenDetails={() => router.push(`/properties/${h.id}`)}
              />
            ))}
            {maisonsFiltered.length === 0 && <p className="text-sm text-muted-foreground">Aucune maison.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Immeubles</h3>
          <div className="space-y-3">
            {immeublesFiltered.map((h) => (
              <HousePropertyCard
                key={h.id}
                h={h}
                isManager={isManager}
                kind="immeuble"
                isOverdue={houseIsOverdue(h)}
                onEdit={() => openHouseEditor(h.id)}
                onDeleted={async () => {
                  await deleteHouseApi(h.id);
                  await refresh();
                  toast.success("Immeuble supprimé.");
                }}
                onOpenDetails={() => router.push(`/properties/${h.id}`)}
              />
            ))}
            {immeublesFiltered.length === 0 && <p className="text-sm text-muted-foreground">Aucun immeuble.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Studios</h3>
          <div className="space-y-3">
            {studiosFiltered.map((s) => (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/properties/${s.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") router.push(`/properties/${s.id}`);
                }}
                className={[
                  "flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-colors",
                  simplePropertyIsOverdue(s.id) ? "border-destructive/60 bg-destructive/5" : "border-border hover:bg-muted/30",
                ].join(" ")}
              >
                <div>
                  <p className={["text-sm font-semibold", simplePropertyIsOverdue(s.id) ? "text-destructive" : ""].join(" ")}>{s.address}</p>
                  <p className="text-xs text-muted-foreground">Loyer mensuel: ${s.monthlyRent}</p>
                  {simplePropertyIsOverdue(s.id) && <p className="mt-1 text-xs font-medium text-destructive">Retard de paiement</p>}
                </div>
                {isManager && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        openStudioEditor(s.id);
                      }}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async (e) => {
                        e.stopPropagation();
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
            {studiosFiltered.length === 0 && <p className="text-sm text-muted-foreground">Aucun studio.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Terrains</h3>
          <div className="space-y-3">
            {landsFiltered.map((l) => (
              <div
                key={l.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/properties/${l.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") router.push(`/properties/${l.id}`);
                }}
                className={[
                  "flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-colors",
                  simplePropertyIsOverdue(l.id) ? "border-destructive/60 bg-destructive/5" : "border-border hover:bg-muted/30",
                ].join(" ")}
              >
                <div>
                  <p className={["text-sm font-semibold", simplePropertyIsOverdue(l.id) ? "text-destructive" : ""].join(" ")}>{l.address}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.size} m² · Loyer : ${l.monthlyRent}/mois
                  </p>
                  {simplePropertyIsOverdue(l.id) && <p className="mt-1 text-xs font-medium text-destructive">Retard de paiement</p>}
                </div>
                {isManager && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        openLandEditor(l.id);
                      }}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async (e) => {
                        e.stopPropagation();
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
            {landsFiltered.length === 0 && <p className="text-sm text-muted-foreground">Aucun terrain.</p>}
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
                onClick={() =>
                  setLevels((prev) => [
                    ...prev,
                    { floor: houseBaseFloor + prev.length, apartments: [{ number: 1, rentPrice: null }] },
                  ])
                }
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
                      floor: houseBaseFloor + prev.length,
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
                    onClick={() =>
                      setLevels((prev) => renumberLevels(prev.filter((_, i) => i !== lvlIdx), houseBaseFloor))
                    }
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
