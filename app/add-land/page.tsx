"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Map } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  address: z.string().min(3, "Adresse requise (min. 3 caractères)"),
  size: z.coerce.number().positive("La taille doit être supérieure à 0"),
});

type FormValues = z.infer<typeof schema>;

export default function AddLandPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    toast.success(`Terrain "${values.address}" enregistré (${values.size} m²).`);
    reset();
    router.push("/properties");
  }

  return (
    <DashboardLayout
      title="Ajouter un terrain"
      description="Renseignez l'adresse et la taille du terrain"
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
                  Saisissez les informations de base du terrain.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="address">Adresse complète</Label>
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
                <Label htmlFor="size">Taille (m²)</Label>
                <Input
                  id="size"
                  type="number"
                  min={1}
                  step="0.01"
                  placeholder="450"
                  {...register("size")}
                  className={errors.size ? "border-destructive" : ""}
                />
                {errors.size && (
                  <p className="text-xs text-destructive">{errors.size.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  Ajouter le terrain
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

