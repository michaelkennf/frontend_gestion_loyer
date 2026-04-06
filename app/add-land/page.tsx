"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Map } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  address: z.string().min(3, "Adresse requise (min. 3 caractères)"),
  size: z.coerce.number().positive("La superficie doit être supérieure à 0"),
  monthlyRent: z.coerce.number().positive("Le prix de location doit être supérieur à 0"),
});

type FormValues = z.infer<typeof schema>;

export default function AddLandPage() {
  const router = useRouter();
  const { addLand, user } = useAppStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    if (user?.role !== "MANAGER") return toast.error("Action réservée au gestionnaire.");
    await addLand({
      address: values.address.trim(),
      size: values.size,
      monthlyRent: values.monthlyRent,
    });
    toast.success(`Terrain « ${values.address.trim()} » enregistré.`);
    reset();
    router.push("/properties");
  }

  return (
    <DashboardLayout
      title="Ajouter un terrain"
      description="Adresse, superficie et prix de location"
    >
      <div className="w-full max-w-xl">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Map className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Formulaire terrain</CardTitle>
                <CardDescription>
                  Renseignez l&apos;adresse du terrain, sa taille et le loyer demandé.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="address">Adresse du terrain</Label>
                <Input
                  id="address"
                  placeholder="Route de Matadi, Mont-Ngafula, Kinshasa"
                  {...register("address")}
                  className={errors.address ? "border-destructive" : ""}
                />
                {errors.address && (
                  <p className="text-xs text-destructive">{errors.address.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="size">Superficie (m²)</Label>
                <Input
                  id="size"
                  type="number"
                  min={0.01}
                  step="0.01"
                  placeholder="450"
                  {...register("size")}
                  className={errors.size ? "border-destructive" : ""}
                />
                {errors.size && (
                  <p className="text-xs text-destructive">{errors.size.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlyRent">Prix de location ($ / mois)</Label>
                <Input
                  id="monthlyRent"
                  type="number"
                  min={0.01}
                  step="0.01"
                  placeholder="200.00"
                  {...register("monthlyRent")}
                  className={errors.monthlyRent ? "border-destructive" : ""}
                />
                {errors.monthlyRent && (
                  <p className="text-xs text-destructive">{errors.monthlyRent.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  Enregistrer le terrain
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push("/add-property")}>
                  Retour au choix
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
