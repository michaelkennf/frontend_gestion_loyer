"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { addPaymentApi } from "@/lib/api";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { floorDisplayLabel } from "@/lib/utils";

const schema = z.object({
  propertyType: z.enum(["house", "building", "studio", "land"], { required_error: "Type requis" }),
  propertyId: z.string().min(1, "Sélectionnez une propriété"),
  tenantName: z.string().trim().min(2, "Nom du locataire requis"),
  floor: z.coerce.number().int().min(0).optional(),
  apartmentNumber: z.coerce.number().int().min(1).optional(),
  month: z.string().min(1, "Mois requis"),
  amount: z.coerce.number().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.propertyType === "house" || data.propertyType === "building") {
    if (!Number.isInteger(data.floor)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Niveau requis", path: ["floor"] });
    }
    if (!data.apartmentNumber) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Appartement requis", path: ["apartmentNumber"] });
    }
  }
  if (
    (data.propertyType === "studio" || data.propertyType === "land") &&
    (!data.amount || data.amount <= 0)
  ) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Le montant doit être positif", path: ["amount"] });
  }
  if (!data.month || !/^\d{4}-\d{2}$/.test(data.month)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Format AAAA-MM requis", path: ["month"] });
  }
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPaymentPage() {
  const router = useRouter();
  const { houses, studios, lands, refresh, user } = useAppStore();
  const [contractFile, setContractFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      propertyType: undefined,
      propertyId: "",
      tenantName: "",
      month: new Date().toISOString().slice(0, 7),
      floor: undefined,
      apartmentNumber: undefined,
      notes: "",
    },
  });

  const propertyType = watch("propertyType");
  const propertyId = watch("propertyId");
  const floor = watch("floor");
  const watchedAmount = watch("amount");
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
  const selectedLevel = selectedHouse?.layout?.find((l) => l.floor === floor);

  const currentMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    if (propertyType === "land" && propertyId) {
      const l = lands.find((x) => x.id === propertyId);
      if (l) setValue("amount", l.monthlyRent);
    } else if (propertyType === "studio" && propertyId) {
      const s = studios.find((x) => x.id === propertyId);
      if (s) setValue("amount", s.monthlyRent);
    }
  }, [propertyType, propertyId, lands, studios, setValue]);

  const watchedApartmentNumber = watch("apartmentNumber");
  useEffect(() => {
    if ((propertyType === "house" || propertyType === "building") && selectedLevel && watchedApartmentNumber) {
      const apt = selectedLevel.apartments.find((a) => a.number === watchedApartmentNumber);
      if (apt) setValue("amount", apt.rentPrice);
    }
  }, [propertyType, selectedLevel, watchedApartmentNumber, setValue]);

  const referenceRent: number | null = (() => {
    if (propertyType === "house" || propertyType === "building") {
      const apt = selectedLevel?.apartments.find((a) => a.number === watchedApartmentNumber);
      return apt?.rentPrice ?? null;
    }
    if (propertyType === "studio") return studios.find((s) => s.id === propertyId)?.monthlyRent ?? null;
    if (propertyType === "land") return lands.find((l) => l.id === propertyId)?.monthlyRent ?? null;
    return null;
  })();
  const remainingDue = referenceRent !== null && watchedAmount !== undefined && watchedAmount > 0
    ? Math.max(0, Math.round((referenceRent - watchedAmount) * 100) / 100)
    : 0;

  async function onSubmit(values: FormValues) {
    if (user?.role !== "MANAGER") return toast.error("Action réservée au gestionnaire.");

    await addPaymentApi({
      propertyId: values.propertyId,
      propertyType: values.propertyType,
      paymentKind: "monthly",
      tenantName: values.tenantName,
      month: values.month,
      amount: values.amount ?? 0,
      notes: values.notes,
      floor: values.propertyType === "house" || values.propertyType === "building" ? values.floor : undefined,
      apartmentNumber: values.propertyType === "house" || values.propertyType === "building" ? values.apartmentNumber : undefined,
      contractFile,
    });

    toast.success("Paiement de loyer enregistré.");
    await refresh();
    reset();
    setContractFile(null);
    router.push("/dashboard");
  }

  return (
    <DashboardLayout
      title="Enregistrer un loyer"
      description="Saisir un paiement de loyer reçu"
    >
      <div className="w-full max-w-xl">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Détails du paiement</CardTitle>
            <CardDescription>
              Sélectionnez la propriété et renseignez le montant reçu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Property type */}
              <div className="space-y-2">
                <Label>Type de propriété</Label>
                <Controller
                  name="propertyType"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
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
                {errors.propertyType && (
                  <p className="text-xs text-destructive">{errors.propertyType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenantName">Nom du locataire</Label>
                <Input
                  id="tenantName"
                  placeholder="Ex: Jean Mukendi"
                  {...register("tenantName")}
                  className={errors.tenantName ? "border-destructive" : ""}
                />
                {errors.tenantName && (
                  <p className="text-xs text-destructive">{errors.tenantName.message}</p>
                )}
              </div>

              {/* Property */}
              {propertyType && (
                <div className="space-y-2">
                  <Label>Propriété</Label>
                  <Controller
                    name="propertyId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <SelectTrigger className={errors.propertyId ? "border-destructive" : ""}>
                          <SelectValue
                            placeholder={
                              propertyList.length === 0
                                ? "Aucune propriété disponible"
                                : "Sélectionner…"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {propertyList.length === 0 ? (
                            <SelectItem value="_none" disabled>
                              Aucune propriété enregistrée
                            </SelectItem>
                          ) : (
                            propertyList.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {propertyType === "land"
                                  ? `${(p as { address: string }).address} · $${(p as { monthlyRent: number }).monthlyRent}/mois`
                                  : (p as { address: string }).address}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.propertyId && (
                    <p className="text-xs text-destructive">{errors.propertyId.message}</p>
                  )}
                </div>
              )}

              {(propertyType === "house" || propertyType === "building") && selectedHouse && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Niveau</Label>
                    <Controller
                      name="floor"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={(v) => field.onChange(Number(v))}
                          value={Number.isInteger(field.value) ? String(field.value) : ""}
                        >
                          <SelectTrigger className={errors.floor ? "border-destructive" : ""}>
                            <SelectValue placeholder="Sélectionner…" />
                          </SelectTrigger>
                          <SelectContent>
                            {[...(selectedHouse.layout ?? [])]
                              .sort((a, b) => a.floor - b.floor)
                              .map((lvl) => (
                                <SelectItem key={lvl.floor} value={String(lvl.floor)}>
                                  {floorDisplayLabel(lvl.floor)}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.floor && <p className="text-xs text-destructive">{errors.floor.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Appartement</Label>
                    <Controller
                      name="apartmentNumber"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={(v) => field.onChange(Number(v))}
                          value={typeof field.value === "number" ? String(field.value) : ""}
                        >
                          <SelectTrigger className={errors.apartmentNumber ? "border-destructive" : ""}>
                            <SelectValue placeholder="Sélectionner…" />
                          </SelectTrigger>
                          <SelectContent>
                            {(selectedLevel?.apartments ?? []).map((a) => (
                              <SelectItem key={a.number} value={String(a.number)}>Appartement {a.number} - ${a.rentPrice}</SelectItem>
                            ))}
                            {!selectedLevel && (
                              <SelectItem value="_none" disabled>Aucun appartement disponible</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.apartmentNumber && <p className="text-xs text-destructive">{errors.apartmentNumber.message}</p>}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="month">Mois de référence</Label>
                <Input
                  id="month"
                  type="month"
                  defaultValue={currentMonth}
                  {...register("month")}
                  className={errors.month ? "border-destructive" : ""}
                />
                {errors.month && (
                  <p className="text-xs text-destructive">{errors.month.message}</p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Montant reçu ($)</Label>
                <Controller
                  name="amount"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="amount"
                      type="number"
                      min={1}
                      step="0.01"
                      placeholder="150.00"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        field.onChange(raw === "" ? undefined : Number(raw));
                      }}
                      className={errors.amount ? "border-destructive" : ""}
                    />
                  )}
                />
                {referenceRent !== null && (
                  <p className="text-xs text-muted-foreground">
                    Loyer de référence : <span className="font-medium text-foreground">${referenceRent}</span>
                  </p>
                )}
                {remainingDue > 0 && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    Paiement partiel — Reste dû : <span className="font-semibold">${Number.isInteger(remainingDue) ? remainingDue : remainingDue.toFixed(2)}</span>
                  </div>
                )}
                {errors.amount && (
                  <p className="text-xs text-destructive">{errors.amount.message}</p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Textarea
                  id="notes"
                  placeholder="Informations complémentaires…"
                  rows={3}
                  {...register("notes")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractFile">Contrat scanné (PDF)</Label>
                <Input
                  id="contractFile"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (file && file.type !== "application/pdf") {
                      toast.error("Veuillez sélectionner un fichier PDF.");
                      e.currentTarget.value = "";
                      setContractFile(null);
                      return;
                    }
                    setContractFile(file);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Le contrat PDF est optionnel mais recommandé.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  Enregistrer le paiement
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
