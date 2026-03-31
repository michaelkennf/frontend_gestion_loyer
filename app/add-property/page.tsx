"use client";

import Link from "next/link";
import { ArrowRight, Building2, Home, Landmark, Map } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const propertyChoices = [
  {
    href: "/add-house",
    title: "Ajouter une maison",
    description: "Créer une maison avec niveaux, appartements et loyers individuels.",
    icon: Home,
  },
  {
    href: "/add-studio",
    title: "Ajouter un studio",
    description: "Créer un studio avec adresse et loyer mensuel.",
    icon: Building2,
  },
  {
    href: "/add-building",
    title: "Ajouter un immeuble",
    description: "Enregistrer un immeuble (formulaire dédié).",
    icon: Landmark,
  },
  {
    href: "/add-land",
    title: "Ajouter un terrain",
    description: "Enregistrer un terrain (formulaire dédié).",
    icon: Map,
  },
];

export default function AddPropertyPage() {
  return (
    <DashboardLayout
      title="Ajouter une propriété"
      description="Choisissez le type de propriété à enregistrer"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {propertyChoices.map((choice) => {
          const Icon = choice.icon;
          return (
            <Link
              key={choice.href}
              href={choice.href}
              className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {choice.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{choice.description}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>
      <Card className="mt-6 border-border">
        <CardHeader>
          <CardTitle className="text-base">Note</CardTitle>
          <CardDescription>
            Vous pouvez utiliser cette page comme point d’entrée unique pour toutes les propriétés.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Les formulaires maison et studio conservent la logique actuelle. Les formulaires immeuble et terrain sont
          disponibles ci-dessus et peuvent être enrichis selon vos règles métier.
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

