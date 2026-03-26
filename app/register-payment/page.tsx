"use client";

import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  propertyType: z.enum(["house", "studio"], { required_error: "Type requis" }),
  propertyId: z.string().min(1, "Sélectionnez une propriété"),
  floor: z.coerce.number().int().min(1).optional(),
  apartmentNumber: z.coerce.number().int().min(1).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Format AAAA-MM requis"),
  amount: z.coerce.number().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.propertyType === "house") {
    if (!data.floor) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Niveau requis", path: ["floor"] });
    }
    if (!data.apartmentNumber) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Appartement requis", path: ["apartmentNumber"] });
    }
  }
  if (data.propertyType === "studio" && (!data.amount || data.amount <= 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Le montant doit être positif", path: ["amount"] });
  }
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPaymentPage() {
  const router = useRouter();
  const { houses, studios, addPayment, user } = useAppStore();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      propertyType: undefined,
      propertyId: "",
      month: new Date().toISOString().slice(0, 7),
      floor: undefined,
      apartmentNumber: undefined,
      notes: "",
    },
  });

  const propertyType = watch("propertyType");
  const propertyId = watch("propertyId");
  const floor = watch("floor");
  const propertyList = propertyType === "house" ? houses : propertyType === "studio" ? studios : [];
  const selectedHouse = propertyType === "house" ? houses.find((h) => h.id === propertyId) : undefined;
  const selectedLevel = selectedHouse?.layout?.find((l) => l.floor === floor);

  const currentMonth = new Date().toISOString().slice(0, 7);

  async function onSubmit(values: FormValues) {
    if (user?.role !== "MANAGER") return toast.error("Action réservée au gestionnaire.");
    const property =
      values.propertyType === "house"
        ? houses.find((h) => h.id === values.propertyId)
        : studios.find((s) => s.id === values.propertyId);

    const propertyLabel = property
      ? (property as { address: string }).address
      : "Propriété inconnue";

    const selectedApartmentRent =
      values.propertyType === "house"
        ? selectedHouse?.layout
            ?.find((l) => l.floor === values.floor)
            ?.apartments.find((a) => a.number === values.apartmentNumber)?.rentPrice
        : undefined;

    await addPayment({
      propertyId: values.propertyId,
      propertyType: values.propertyType,
      propertyLabel,
      month: values.month,
      amount: values.propertyType === "house" && selectedApartmentRent ? selectedApartmentRent : values.amount,
      date: new Date().toISOString(),
      notes: values.notes,
      floor: values.propertyType === "house" ? values.floor : undefined,
      apartmentNumber: values.propertyType === "house" ? values.apartmentNumber : undefined,
    });

    toast.success("Paiement de loyer enregistré.");
    reset();
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
                        <SelectItem value="studio">Studio</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.propertyType && (
                  <p className="text-xs text-destructive">{errors.propertyType.message}</p>
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
                                {(p as { address: string }).address}
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

              {propertyType === "house" && selectedHouse && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Niveau</Label>
                    <Controller
                      name="floor"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
                          <SelectTrigger className={errors.floor ? "border-destructive" : ""}>
                            <SelectValue placeholder="Sélectionner…" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: selectedHouse.floors }, (_, i) => i + 1).map((n) => (
                              <SelectItem key={n} value={String(n)}>Niveau {n}</SelectItem>
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
                        <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
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

              {/* Month */}
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
                      readOnly={propertyType === "house"}
                      className={errors.amount ? "border-destructive" : ""}
                    />
                  )}
                />
                {propertyType === "house" && (
                  <p className="text-xs text-muted-foreground">
                    Le montant est défini automatiquement selon l'appartement choisi.
                  </p>
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
