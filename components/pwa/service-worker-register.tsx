"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    // Do not register SW in development: stale cached chunks would interfere
    // with hot-reload and cause authentication loops (Ctrl+F5 was needed to clear them).
    if (process.env.NODE_ENV !== "production") {
      // Unregister any previously installed SW so dev reloads are clean.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Ignore registration errors to avoid blocking app usage.
    });
  }, []);

  return null;
}
