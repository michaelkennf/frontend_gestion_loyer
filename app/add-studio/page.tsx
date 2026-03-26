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
  address: z.string().min(3, "Adresse requise (min. 3 caractères)"),
  monthlyRent: z.coerce.number().positive("Le loyer mensuel doit être positif"),
});

type FormValues = z.infer<typeof schema>;

export default function AddStudioPage() {
  const router = useRouter();
  const { addStudio, user } = useAppStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    if (user?.role !== "MANAGER") return toast.error("Action réservée au gestionnaire.");
    await addStudio(values);
    toast.success(`Studio "${values.address}" ajouté avec succès.`);
    reset();
    router.push("/dashboard");
  }

  return (
    <DashboardLayout
      title="Ajouter un studio"
      description="Enregistrez un nouveau studio dans votre parc immobilier"
    >
      <div className="w-full max-w-xl">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Informations du studio</CardTitle>
            <CardDescription>
              Renseignez l&apos;adresse et le loyer mensuel du studio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="address">Adresse complète</Label>
                <Input
                  id="address"
                  placeholder="Bd du 30 Juin, Commune de la Gombe, Kinshasa"
                  {...register("address")}
                  className={errors.address ? "border-destructive" : ""}
                />
                {errors.address && (
                  <p className="text-xs text-destructive">{errors.address.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlyRent">Loyer mensuel ($)</Label>
                <Input
                  id="monthlyRent"
                  type="number"
                  min={1}
                  step="0.01"
                  placeholder="200"
                  {...register("monthlyRent")}
                  className={errors.monthlyRent ? "border-destructive" : ""}
                />
                {errors.monthlyRent && (
                  <p className="text-xs text-destructive">{errors.monthlyRent.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  Ajouter le studio
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
