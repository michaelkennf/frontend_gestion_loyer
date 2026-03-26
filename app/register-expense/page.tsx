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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRIVATE_CATEGORIES = [
  "Réparation électricité",
  "Réparation plomberie",
  "Peinture",
  "Réparation pavet",
  "Autre",
];

const COMMON_CATEGORIES = [
  "Réparation balcon",
  "Réparation garage",
  "Réparation buanderie",
  "Autre",
];

const schema = z
  .object({
    expenseType: z.enum(["common", "private"], { required_error: "Type requis" }),
    propertyType: z.enum(["house", "studio"], { required_error: "Type de propriété requis" }),
    propertyId: z.string().min(1, "Sélectionnez une propriété"),
    apartmentNumber: z.string().optional(),
    category: z.string().min(1, "Catégorie requise"),
    customCategory: z.string().optional(),
    amount: z.coerce.number().positive("Le montant doit être positif"),
    comment: z.string().optional(),
    date: z.string().min(1, "Date requise"),
  })
  .superRefine((data, ctx) => {
    if (data.expenseType === "private" && !data.apartmentNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Numéro d'appartement requis pour une dépense privée",
        path: ["apartmentNumber"],
      });
    }
    if (data.category === "Autre" && !data.customCategory?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Veuillez saisir la catégorie personnalisée",
        path: ["customCategory"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterExpensePage() {
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
      expenseType: undefined,
      propertyType: undefined,
      propertyId: "",
      apartmentNumber: "",
      category: "",
      customCategory: "",
      comment: "",
      date: new Date().toISOString().slice(0, 10),
    },
  });

  const expenseType = watch("expenseType");
  const propertyType = watch("propertyType");
  const category = watch("category");
  const propertyList = propertyType === "house" ? houses : propertyType === "studio" ? studios : [];
  const categoryList = expenseType === "private" ? PRIVATE_CATEGORIES : COMMON_CATEGORIES;

  async function onSubmit(values: FormValues) {
    if (user?.role !== "MANAGER") return toast.error("Action réservée au gestionnaire.");
    const property =
      values.propertyType === "house"
        ? houses.find((h) => h.id === values.propertyId)
        : studios.find((s) => s.id === values.propertyId);

    const propertyLabel = property
      ? (property as { address: string }).address
      : "Propriété inconnue";

    await addExpense({
      expenseType: values.expenseType,
      propertyId: values.propertyId,
      propertyType: values.propertyType,
      propertyLabel,
      apartmentNumber: values.apartmentNumber,
      category: values.category === "Autre" ? (values.customCategory ?? "").trim() : values.category,
      amount: values.amount,
      comment: values.comment,
      date: values.date,
    });

    toast.success("Dépense enregistrée avec succès.");
    reset();
    router.push("/dashboard");
  }

  return (
    <DashboardLayout
      title="Enregistrer une dépense"
      description="Saisir une dépense liée à une propriété"
    >
      <div className="w-full max-w-xl">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Détails de la dépense</CardTitle>
            <CardDescription>
              Renseignez le type, la propriété concernée et le montant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Expense type */}
              <div className="space-y-2">
                <Label>Type de dépense</Label>
                <Controller
                  name="expenseType"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <SelectTrigger className={errors.expenseType ? "border-destructive" : ""}>
                        <SelectValue placeholder="Commune ou privée…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="common">Commune (tout le bien)</SelectItem>
                        <SelectItem value="private">Privée (appartement spécifique)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.expenseType && (
                  <p className="text-xs text-destructive">{errors.expenseType.message}</p>
                )}
              </div>

              {/* Property type */}
              <div className="space-y-2">
                <Label>Type de propriété</Label>
                <Controller
                  name="propertyType"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <SelectTrigger className={errors.propertyType ? "border-destructive" : ""}>
                        <SelectValue placeholder="Maison ou studio…" />
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

              {/* Apartment number — only for private expenses */}
              {expenseType === "private" && (
                <div className="space-y-2">
                  <Label htmlFor="apartmentNumber">Numéro d&apos;appartement</Label>
                  <Input
                    id="apartmentNumber"
                    placeholder="Ex : Apt 3B, 2ème étage gauche…"
                    {...register("apartmentNumber")}
                    className={errors.apartmentNumber ? "border-destructive" : ""}
                  />
                  {errors.apartmentNumber && (
                    <p className="text-xs text-destructive">{errors.apartmentNumber.message}</p>
                  )}
                </div>
              )}

              {/* Category */}
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <SelectTrigger className={errors.category ? "border-destructive" : ""}>
                        <SelectValue placeholder="Sélectionner une catégorie…" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryList.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.category && (
                  <p className="text-xs text-destructive">{errors.category.message}</p>
                )}
              </div>

              {category === "Autre" && (
                <div className="space-y-2">
                  <Label htmlFor="customCategory">Catégorie personnalisée</Label>
                  <Input
                    id="customCategory"
                    placeholder="Saisissez la catégorie..."
                    {...register("customCategory")}
                    className={errors.customCategory ? "border-destructive" : ""}
                  />
                  {errors.customCategory && (
                    <p className="text-xs text-destructive">{errors.customCategory.message}</p>
                  )}
                </div>
              )}

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Montant ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  min={0.01}
                  step="0.01"
                  placeholder="75.00"
                  {...register("amount")}
                  className={errors.amount ? "border-destructive" : ""}
                />
                {errors.amount && (
                  <p className="text-xs text-destructive">{errors.amount.message}</p>
                )}
              </div>

              {/* Date */}
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

              {/* Comment */}
              <div className="space-y-2">
                <Label htmlFor="comment">Commentaire (optionnel)</Label>
                <Textarea
                  id="comment"
                  placeholder="Précisions sur la dépense…"
                  rows={3}
                  {...register("comment")}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  Enregistrer la dépense
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
