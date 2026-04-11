"use client";

import Link from "next/link";
import { ArrowUpFromLine, TrendingDown, PlusSquare, ArrowRight, Landmark, Truck, Shield } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAppStore } from "@/lib/store";

const actions = [
  {
    href: "/register-payment",
    icon: ArrowUpFromLine,
    title: "Enregistrer un loyer",
    description: "Saisir un paiement de loyer reçu pour une maison ou un studio.",
    color: "bg-income-bg",
    iconColor: "text-income",
    border: "border-income/20",
  },
  {
    href: "/register-expense",
    icon: TrendingDown,
    title: "Enregistrer une dépense",
    description: "Ajouter une dépense commune ou privée liée à une propriété.",
    color: "bg-expense-bg",
    iconColor: "text-expense",
    border: "border-expense/20",
  },
  {
    href: "/register-tax",
    icon: Landmark,
    title: "Paiement taxe",
    description: "Enregistrer un paiement de taxe pour maison, studio ou immeuble.",
    color: "bg-muted",
    iconColor: "text-foreground",
    border: "border-border",
  },
  {
    href: "/rental-deposits",
    icon: Shield,
    title: "Garantie locative",
    description: "Voir les garanties par propriété et appartement, dépenses ou remises sur la garantie.",
    color: "bg-balance-bg",
    iconColor: "text-balance",
    border: "border-balance/20",
  },
  {
    href: "/add-property",
    icon: PlusSquare,
    title: "Ajouter une propriété",
    description: "Choisir et enregistrer une maison, un studio, un immeuble ou un terrain.",
    color: "bg-balance-bg",
    iconColor: "text-balance",
    border: "border-balance/20",
  },
  {
    href: "/add-supplier",
    icon: Truck,
    title: "Enregistrer un fournisseur",
    description: "Ajouter un fournisseur (nom et contact) pour les dépenses communes.",
    color: "bg-muted",
    iconColor: "text-foreground",
    border: "border-border",
  },
];

export default function ActionsPage() {
  const { user } = useAppStore();
  const canManage = user?.role === "MANAGER";
  return (
    <DashboardLayout
      title="Actions rapides"
      description="Que souhaitez-vous faire ?"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(canManage ? actions : []).map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={`group flex items-start gap-5 rounded-xl border ${action.border} bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${action.color}`}>
                <Icon className={`h-6 w-6 ${action.iconColor}`} />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                  {action.title}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">{action.description}</p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          );
        })}
        {!canManage && (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Aucune action d'edition disponible pour votre role.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
