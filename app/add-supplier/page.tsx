"use client";

import { useRouter } from "next/navigation";
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
  name: z.string().trim().min(1, "Nom requis"),
  contact: z.string().trim().min(1, "Contact requis"),
});

type FormValues = z.infer<typeof schema>;

export default function AddSupplierPage() {
  const router = useRouter();
  const { addSupplier, user } = useAppStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    if (user?.role !== "MANAGER") return toast.error("Action réservée au gestionnaire.");
    await addSupplier({ name: values.name, contact: values.contact });
    toast.success(`Fournisseur « ${values.name} » enregistré.`);
    reset();
    router.push("/suppliers");
  }

  return (
    <DashboardLayout
      title="Ajouter un fournisseur"
      description="Référencez un fournisseur pour les dépenses communes"
    >
      <div className="w-full max-w-xl">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Fournisseur</CardTitle>
            <CardDescription>Nom et coordonnées de contact (téléphone, e-mail, etc.).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
                  placeholder="Ex : SNEL, Entreprise XYZ…"
                  {...register("name")}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contact</Label>
                <Input
                  id="contact"
                  placeholder="Ex : +243 81 000 00 00, contact@exemple.cd"
                  {...register("contact")}
                  className={errors.contact ? "border-destructive" : ""}
                />
                {errors.contact && <p className="text-xs text-destructive">{errors.contact.message}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  Enregistrer
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
