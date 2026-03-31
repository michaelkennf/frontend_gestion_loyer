"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  address: z.string().min(3, "Adresse requise (min. 3 caractères)"),
  floors: z.coerce.number().int().min(1, "Au moins 1 étage"),
});

type FormValues = z.infer<typeof schema>;

export default function AddBuildingPage() {
  const router = useRouter();
  const { addHouse, user } = useAppStore();
  const [levels, setLevels] = useState<{ floor: number; apartmentsCount: number; rents: Array<number | null> }[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const floors = watch("floors");

  async function onSubmit(values: FormValues) {
    if (user?.role !== "MANAGER") return toast.error("Action réservée au gestionnaire.");
    if (levels.length !== values.floors || levels.some((l) => l.apartmentsCount < 1 || l.rents.length !== l.apartmentsCount || l.rents.some((r) => !r || r <= 0))) {
      return toast.error("Veuillez configurer chaque niveau avec appartements et loyers individuels.");
    }
    await addHouse({
      address: values.address,
      levels: levels.map((l) => ({
        floor: l.floor,
        apartments: Array.from({ length: l.apartmentsCount }, (_, i) => ({
          number: i + 1,
          rentPrice: l.rents[i] ?? 0,
        })),
      })),
    });
    toast.success(`Immeuble "${values.address}" ajouté avec succès.`);
    reset();
    setLevels([]);
    router.push("/properties");
  }

  function buildLevels(count: number) {
    setLevels(
      Array.from({ length: count }, (_, i) => ({
        floor: i + 1,
        apartmentsCount: 1,
        rents: [null],
      }))
    );
  }

  return (
    <DashboardLayout
      title="Ajouter un immeuble"
      description="Enregistrez un nouvel immeuble avec niveaux et loyers par appartement"
    >
      <div className="w-full max-w-xl">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Informations de l&apos;immeuble</CardTitle>
            <CardDescription>
              Renseignez les niveaux et les loyers individuels comme pour une maison.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="address">Adresse complète</Label>
                <Input
                  id="address"
                  placeholder="Av. Kasa-Vubu, Commune de Kasa-Vubu, Kinshasa"
                  {...register("address")}
                  className={errors.address ? "border-destructive" : ""}
                />
                {errors.address && (
                  <p className="text-xs text-destructive">{errors.address.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="floors">Nombre d&apos;étages</Label>
                <Input
                  id="floors"
                  type="number"
                  min={1}
                  placeholder="3"
                  {...register("floors")}
                  className={errors.floors ? "border-destructive" : ""}
                />
                {errors.floors && <p className="text-xs text-destructive">{errors.floors.message}</p>}
                <Button type="button" variant="outline" className="mt-2" onClick={() => buildLevels(Number(floors || 0))}>
                  Générer les niveaux
                </Button>
              </div>

              {levels.map((level, idx) => (
                <div key={level.floor} className="rounded-lg border border-border p-4 space-y-3">
                  <p className="text-sm font-semibold">Niveau {level.floor}</p>
                  <div className="space-y-2">
                    <Label>Nombre d&apos;appartements au niveau {level.floor}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={level.apartmentsCount}
                      onChange={(e) => {
                        const count = Math.max(1, Number(e.target.value || 1));
                        setLevels((prev) =>
                          prev.map((l, i) =>
                            i === idx
                              ? { ...l, apartmentsCount: count, rents: Array.from({ length: count }, (_, ri) => l.rents[ri] ?? null) }
                              : l
                          )
                        );
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {Array.from({ length: level.apartmentsCount }, (_, aptIdx) => (
                      <div key={`${level.floor}-${aptIdx}`} className="space-y-1">
                        <Label>Appartement {aptIdx + 1} - loyer ($)</Label>
                        <Input
                          type="number"
                          min={1}
                          step="0.01"
                          value={level.rents[aptIdx] ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const value = raw === "" ? null : Number(raw);
                            setLevels((prev) =>
                              prev.map((l, i) =>
                                i === idx
                                  ? { ...l, rents: l.rents.map((r, ri) => (ri === aptIdx ? value : r)) }
                                  : l
                              )
                            );
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  Ajouter l&apos;immeuble
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

