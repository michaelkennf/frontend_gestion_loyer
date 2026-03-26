"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { useAppStore } from "@/lib/store";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function DashboardLayout({ children, title, description }: DashboardLayoutProps) {
  const router = useRouter();
  const { user, loading } = useAppStore();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      {/* Main content — offset by sidebar on desktop, top bar on mobile */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Page header — hidden on mobile (title shown inline) */}
        <header className="hidden lg:flex h-16 shrink-0 items-center border-b border-border bg-card px-8">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 pt-20 pb-8 lg:px-8 lg:pt-8 lg:pb-10">
          {/* Mobile page title */}
          <div className="mb-5 lg:hidden">
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
