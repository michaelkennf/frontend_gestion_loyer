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

const schema = z.object({
  propertyType: z.enum(["house", "building", "studio"], { required_error: "Type de propriété requis" }),
  propertyId: z.string().min(1, "Sélectionnez une propriété"),
  taxName: z.string().trim().min(2, "Nom de la taxe requis"),
  amount: z.coerce.number().positive("Le montant doit être positif"),
  date: z.string().min(1, "Date requise"),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterTaxPage() {
  const router = useRouter();
  const { houses, studios, addExpense, user } = useAppStore();

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
      taxName: "",
      date: new Date().toISOString().slice(0, 10),
    },
  });

  const propertyType = watch("propertyType");
  const propertyList =
    propertyType === "house" || propertyType === "building"
      ? houses
      : propertyType === "studio"
        ? studios
        : [];

  async function onSubmit(values: FormValues) {
    if (user?.role !== "MANAGER") return toast.error("Action réservée au gestionnaire.");
    const property =
      values.propertyType === "house" || values.propertyType === "building"
        ? houses.find((h) => h.id === values.propertyId)
        : studios.find((s) => s.id === values.propertyId);

    const propertyLabel = property ? (property as { address: string }).address : "Propriété inconnue";

    await addExpense({
      expenseType: "common",
      propertyType: values.propertyType,
      propertyId: values.propertyId,
      propertyLabel,
      category: values.taxName.trim(),
      amount: values.amount,
      date: values.date,
      comment: "Paiement taxe",
    });

    toast.success("Paiement taxe enregistré.");
    reset();
    router.push("/finances");
  }

  return (
    <DashboardLayout
      title="Paiement taxe"
      description="Enregistrer une taxe pour maison, studio ou immeuble"
    >
      <div className="w-full max-w-xl">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Détails du paiement taxe</CardTitle>
            <CardDescription>
              Sélectionnez la propriété, le nom de la taxe et le montant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.propertyType && (
                  <p className="text-xs text-destructive">{errors.propertyType.message}</p>
                )}
              </div>

              {propertyType && (
                <div className="space-y-2">
                  <Label>Propriété</Label>
                  <Controller
                    name="propertyId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <SelectTrigger className={errors.propertyId ? "border-destructive" : ""}>
                          <SelectValue placeholder={propertyList.length ? "Sélectionner…" : "Aucune propriété disponible"} />
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

              <div className="space-y-2">
                <Label htmlFor="taxName">Nom de la taxe</Label>
                <Input
                  id="taxName"
                  placeholder="Ex: Taxe foncière"
                  {...register("taxName")}
                  className={errors.taxName ? "border-destructive" : ""}
                />
                {errors.taxName && (
                  <p className="text-xs text-destructive">{errors.taxName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Montant ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  min={0.01}
                  step="0.01"
                  placeholder="120"
                  {...register("amount")}
                  className={errors.amount ? "border-destructive" : ""}
                />
                {errors.amount && (
                  <p className="text-xs text-destructive">{errors.amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  {...register("date")}
                  className={errors.date ? "border-destructive" : ""}
                />
                {errors.date && (
                  <p className="text-xs text-destructive">{errors.date.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  Enregistrer paiement taxe
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

