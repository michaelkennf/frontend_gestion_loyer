"use client";

import Link from "next/link";
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
  "SNEL",
  "REGIDESO",
  "SECURITE",
  "GENERATEUR (GROUPE ELECTRONIQUE)",
  "IMMONDICE",
  "Autre",
];

const schema = z
  .object({
    expenseType: z.enum(["common", "private"], { required_error: "Type requis" }),
    propertyType: z.enum(["house", "building", "studio", "land"], { required_error: "Type de propriété requis" }),
    propertyId: z.string().optional(),
    apartmentNumber: z.string().optional(),
    category: z.string().min(1, "Catégorie requise"),
    customCategory: z.string().optional(),
    amount: z.coerce.number().positive("Le montant doit être positif"),
    comment: z.string().optional(),
    date: z.string().min(1, "Date requise"),
    supplierId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.propertyId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: data.propertyType === "land" ? "Sélectionnez un terrain" : "Sélectionnez une propriété",
        path: ["propertyId"],
      });
    }
    if (data.propertyType !== "land" && data.expenseType === "private" && !data.apartmentNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Numéro d'appartement requis pour une dépense privée",
        path: ["apartmentNumber"],
      });
    }
    if (data.propertyType !== "land" && data.category === "Autre" && !data.customCategory?.trim()) {
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
  const { houses, studios, lands, suppliers, addExpense, user } = useAppStore();

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
      expenseType: "common",
      propertyType: undefined,
      propertyId: "",
      apartmentNumber: "",
      category: "",
      customCategory: "",
      comment: "",
      date: new Date().toISOString().slice(0, 10),
      supplierId: "__none__",
    },
  });

  const expenseType = watch("expenseType");
  const propertyType = watch("propertyType");
  const category = watch("category");
  const supplierIdWatch = watch("supplierId");
  const selectedSupplier = suppliers.find((s) => s.id === supplierIdWatch);
  const propertyList =
    propertyType === "house" || propertyType === "building"
      ? houses
      : propertyType === "studio"
        ? studios
        : propertyType === "land"
          ? lands
          : [];
  const categoryList = expenseType === "private" ? PRIVATE_CATEGORIES : COMMON_CATEGORIES;

  async function onSubmit(values: FormValues) {
    if (user?.role !== "MANAGER") return toast.error("Action réservée au gestionnaire.");
    const property =
      values.propertyType === "house" || values.propertyType === "building"
        ? houses.find((h) => h.id === values.propertyId)
        : values.propertyType === "studio"
          ? studios.find((s) => s.id === values.propertyId)
          : lands.find((l) => l.id === values.propertyId);

    const propertyLabel =
      values.propertyType === "land"
        ? property
          ? (property as { address: string }).address
          : "Terrain"
        : property
          ? (property as { address: string }).address
          : "Propriété inconnue";

    const supplierId =
      values.propertyType !== "land" &&
      values.expenseType === "common" &&
      values.supplierId &&
      values.supplierId !== "__none__"
        ? values.supplierId
        : undefined;

    await addExpense({
      expenseType: values.propertyType === "land" ? "common" : values.expenseType,
      propertyId: values.propertyId,
      propertyType: values.propertyType,
      propertyLabel,
      apartmentNumber: values.apartmentNumber,
      category: values.category === "Autre" ? (values.customCategory ?? "").trim() : values.category,
      amount: values.amount,
      comment: values.propertyType === "land" ? undefined : values.comment,
      date: values.date,
      supplierId,
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
              {/* Expense type — masqué pour le terrain (toujours saisi comme dépense globale) */}
              {propertyType !== "land" && (
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
              )}

              {/* Property type */}
              <div className="space-y-2">
                <Label>Type de propriété</Label>
                <Controller
                  name="propertyType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={(v) => {
                        field.onChange(v);
                        if (v === "land") setValue("expenseType", "common");
                      }}
                      value={field.value ?? ""}
                    >
                      <SelectTrigger className={errors.propertyType ? "border-destructive" : ""}>
                        <SelectValue placeholder="Maison ou studio…" />
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

              {/* Property / terrain */}
              {propertyType && (
                <div className="space-y-2">
                  <Label>{propertyType === "land" ? "Terrain" : "Propriété"}</Label>
                  <Controller
                    name="propertyId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <SelectTrigger className={errors.propertyId ? "border-destructive" : ""}>
                          <SelectValue
                            placeholder={
                              propertyList.length === 0
                                ? propertyType === "land"
                                  ? "Aucun terrain enregistré"
                                  : "Aucune propriété disponible"
                                : "Sélectionner…"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {propertyList.length === 0 ? (
                            <SelectItem value="_none" disabled>
                              {propertyType === "land" ? "Enregistrez un terrain d’abord" : "Aucune propriété enregistrée"}
                            </SelectItem>
                          ) : (
                            propertyList.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {propertyType === "land"
                                  ? `${(p as { address: string }).address} · ${(p as { size: number }).size} m² · $${(p as { monthlyRent: number }).monthlyRent}/mois`
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

              {/* Apartment number — only for private expenses */}
              {propertyType !== "land" && expenseType === "private" && (
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
              {propertyType === "land" ? (
                <div className="space-y-2">
                  <Label htmlFor="category">Description de la dépense</Label>
                  <Textarea
                    id="category"
                    placeholder="Ex. : débroussaillage, clôture, bornage, frais administratifs…"
                    rows={3}
                    {...register("category")}
                    className={errors.category ? "border-destructive" : ""}
                  />
                  {errors.category && (
                    <p className="text-xs text-destructive">{errors.category.message}</p>
                  )}
                </div>
              ) : (
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
              )}

              {propertyType !== "land" && category === "Autre" && (
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

              {expenseType === "common" && propertyType !== "land" && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>Fournisseur (dépense commune)</Label>
                    <Link
                      href="/suppliers"
                      className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Ajouter un fournisseur
                    </Link>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <Controller
                      name="supplierId"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? "__none__"}>
                          <SelectTrigger className="w-full sm:max-w-md">
                            <SelectValue placeholder="Aucun fournisseur" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Aucun fournisseur</SelectItem>
                            {suppliers.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {selectedSupplier && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Contact :</span> {selectedSupplier.contact}
                      </p>
                    )}
                  </div>
                  {suppliers.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Aucun fournisseur enregistré. Utilisez le lien ci-dessus pour en créer un.
                    </p>
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

              {propertyType !== "land" && (
                <div className="space-y-2">
                  <Label htmlFor="comment">Commentaire (optionnel)</Label>
                  <Textarea
                    id="comment"
                    placeholder="Précisions sur la dépense…"
                    rows={3}
                    {...register("comment")}
                  />
                </div>
              )}

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
