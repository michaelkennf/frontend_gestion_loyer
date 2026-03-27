"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building, Eye, EyeOff, LogIn } from "lucide-react";
import { toast } from "sonner";
import { login } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  username: z.string().min(1, "Identifiant requis"),
  password: z.string().min(1, "Mot de passe requis"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const user = await login(values.username, values.password);
      toast.success(`Bienvenue, ${user.username} !`);
      router.push(user.role === "ADMIN" ? "/admin-users" : "/dashboard");
    } catch {
      toast.error("Identifiant ou mot de passe incorrect.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col bg-sidebar p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary">
            <Building className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-sidebar-foreground">LocaPro</span>
        </div>

        <div className="flex flex-1 items-center">
          <div className="space-y-4">
            <blockquote className="text-2xl font-medium leading-relaxed text-sidebar-foreground text-balance">
              &ldquo;Gérez vos propriétés, suivez vos loyers et maîtrisez vos dépenses en toute simplicité.&rdquo;
            </blockquote>
            <p className="text-sidebar-foreground/50 text-sm">
              Votre outil de gestion locative tout-en-un.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Building className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">LocaPro</span>
          </div>

          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Connexion</CardTitle>
              <CardDescription>
                Accédez à votre espace de gestion locative.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username">Identifiant</Label>
                  <Input
                    id="username"
                    placeholder="admin"
                    autoComplete="username"
                    {...register("username")}
                    className={errors.username ? "border-destructive" : ""}
                  />
                  {errors.username && (
                    <p className="text-xs text-destructive">{errors.username.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...register("password")}
                      className={errors.password ? "border-destructive pr-10" : "pr-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Connexion…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn className="h-4 w-4" />
                      Se connecter
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
