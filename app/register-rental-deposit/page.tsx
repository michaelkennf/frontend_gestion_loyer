"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { floorDisplayLabel } from "@/lib/utils";

const schema = z.object({
  propertyType: z.enum(["house", "building", "studio", "land"], { required_error: "Type requis" }),
  propertyId: z.string().min(1, "Sélectionnez une propriété"),
  tenantName: z.string().trim().min(2, "Nom du locataire requis"),
  balance: z.coerce.number().min(0, "Le solde doit être >= 0"),
  notes: z.string().optional(),
  floor: z.coerce.number().int().min(0).optional(),
  apartmentNumber: z.coerce.number().int().min(1).optional(),
}).superRefine((data, ctx) => {
  if (data.propertyType === "house" || data.propertyType === "building") {
    if (!Number.isInteger(data.floor)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Niveau requis", path: ["floor"] });
    if (!data.apartmentNumber) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Appartement requis", path: ["apartmentNumber"] });
  }
});

type FormValues = z.infer<typeof schema>;

export default function RegisterRentalDepositPage() {
  const router = useRouter();
  const { houses, studios, lands, user, upsertRentalDeposit } = useAppStore();
  const canManage = user?.role === "MANAGER";
  const [apartmentOptions, setApartmentOptions] = useState<{ value: number; label: string }[]>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      propertyType: undefined,
      propertyId: "",
      tenantName: "",
      balance: 0,
      notes: "",
      floor: undefined,
      apartmentNumber: undefined,
    },
  });

  const propertyType = watch("propertyType");
  const propertyId = watch("propertyId");
  const floor = watch("floor");

  const propertyList =
    propertyType === "house" || propertyType === "building"
      ? houses
      : propertyType === "studio"
        ? studios
        : propertyType === "land"
          ? lands
          : [];

  const selectedHouse =
    propertyType === "house" || propertyType === "building"
      ? houses.find((h) => h.id === propertyId)
      : undefined;

  useEffect(() => {
    if (!(propertyType === "house" || propertyType === "building")) {
      setApartmentOptions([]);
      setValue("floor", undefined);
      setValue("apartmentNumber", undefined);
      return;
    }
    const level = selectedHouse?.layout?.find((l) => l.floor === floor);
    const options = (level?.apartments ?? []).map((a) => ({ value: a.number, label: `Apt ${a.number}` }));
    setApartmentOptions(options);
    if (options.length === 1) setValue("apartmentNumber", options[0].value);
  }, [propertyType, selectedHouse, floor, setValue]);

  async function onSubmit(values: FormValues) {
    if (!canManage) return toast.error("Action réservée au gestionnaire.");
    await upsertRentalDeposit({
      propertyType: values.propertyType,
      propertyId: values.propertyId,
      tenantName: values.tenantName,
      balance: values.balance,
      notes: values.notes,
      floor: values.propertyType === "house" || values.propertyType === "building" ? values.floor : undefined,
      apartmentNumber: values.propertyType === "house" || values.propertyType === "building" ? values.apartmentNumber : undefined,
    });
    toast.success("Garantie locative enregistrée.");
    router.push("/rental-deposits");
  }

  return (
    <DashboardLayout title="Garantie locative" description="Enregistrer / mettre à jour une garantie locative">
      <div className="w-full max-w-xl">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Détails</CardTitle>
            <CardDescription>Choisissez la propriété, l’appartement (si applicable) et le solde.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label>Type de propriété</Label>
                <Controller
                  name="propertyType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={(v) => {
                        field.onChange(v);
                        setValue("propertyId", "");
                        setValue("floor", undefined);
                        setValue("apartmentNumber", undefined);
                      }}
                      value={field.value ?? ""}
                    >
                      <SelectTrigger className={errors.propertyType ? "border-destructive" : ""}>
                        <SelectValue placeholder="Sélectionner un type…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="house">Maison</SelectItem>
                        <SelectItem value="building">Immeuble</SelectItem>
                        <SelectItem value="studio">Studio</SelectItem>
                        <SelectItem value="land">Terrain</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.propertyType && <p className="text-xs text-destructive">{errors.propertyType.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Propriété</Label>
                <Controller
                  name="propertyId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <SelectTrigger className={errors.propertyId ? "border-destructive" : ""}>
                        <SelectValue placeholder="Sélectionner une propriété…" />
                      </SelectTrigger>
                      <SelectContent>
                        {propertyList.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.address}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.propertyId && <p className="text-xs text-destructive">{errors.propertyId.message}</p>}
              </div>

              {(propertyType === "house" || propertyType === "building") && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Niveau</Label>
                    <Controller
                      name="floor"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={(v) => field.onChange(Number(v))} value={typeof field.value === "number" ? String(field.value) : ""}>
                          <SelectTrigger className={errors.floor ? "border-destructive" : ""}>
                            <SelectValue placeholder="Sélectionner…" />
                          </SelectTrigger>
                          <SelectContent>
                            {(selectedHouse?.layout ?? []).map((lvl) => (
                              <SelectItem key={lvl.floor} value={String(lvl.floor)}>
                                {floorDisplayLabel(lvl.floor)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.floor && <p className="text-xs text-destructive">{errors.floor.message as any}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Appartement</Label>
                    <Controller
                      name="apartmentNumber"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
                          <SelectTrigger className={errors.apartmentNumber ? "border-destructive" : ""}>
                            <SelectValue placeholder="Sélectionner…" />
                          </SelectTrigger>
                          <SelectContent>
                            {apartmentOptions.map((o) => (
                              <SelectItem key={o.value} value={String(o.value)}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.apartmentNumber && <p className="text-xs text-destructive">{errors.apartmentNumber.message as any}</p>}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Nom du locataire</Label>
                <Input {...register("tenantName")} className={errors.tenantName ? "border-destructive" : ""} />
                {errors.tenantName && <p className="text-xs text-destructive">{errors.tenantName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Solde (USD)</Label>
                <Input type="number" step="0.01" min={0} {...register("balance")} className={errors.balance ? "border-destructive" : ""} />
                {errors.balance && <p className="text-xs text-destructive">{errors.balance.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Note (optionnel)</Label>
                <Input {...register("notes")} />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>Enregistrer</Button>
                <Button type="button" variant="outline" onClick={() => router.push("/rental-deposits")}>Annuler</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

