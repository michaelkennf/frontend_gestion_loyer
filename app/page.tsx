"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { refreshSession } from "@/lib/auth";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    refreshSession()
      .then((session) => {
        if (!session) {
          router.replace("/login");
          return;
        }
        router.replace(session.role === "ADMIN" ? "/admin-users" : "/dashboard");
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
