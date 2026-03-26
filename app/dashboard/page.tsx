"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { MonthlyChart } from "@/components/dashboard/monthly-chart";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { PropertyOverview } from "@/components/dashboard/property-overview";

export default function DashboardPage() {
  return (
    <DashboardLayout
      title="Tableau de bord"
      description="Vue d'ensemble de votre portefeuille locatif"
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <SummaryCards />

        {/* Chart + Property overview */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <MonthlyChart />
          </div>
          <div>
            <PropertyOverview />
          </div>
        </div>

        {/* Recent transactions */}
        <RecentTransactions />
      </div>
    </DashboardLayout>
  );
}
