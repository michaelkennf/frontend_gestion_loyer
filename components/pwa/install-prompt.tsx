"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof window === "undefined") {
    return false;
  }
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isAndroid() {
  if (typeof window === "undefined") {
    return false;
  }
  return /android/i.test(window.navigator.userAgent);
}

export function PwaInstallPrompt() {
  const [isInstalled, setIsInstalled] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pendingInstallClick, setPendingInstallClick] = useState(false);

  const triggerInstallPrompt = async (event: BeforeInstallPromptEvent) => {
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
      setDismissed(false);
      sessionStorage.removeItem("pwa-install-dismissed");
    }
    setDeferredPrompt(null);
    setPendingInstallClick(false);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateInstalledState = () => {
      setIsInstalled(isStandaloneMode());
    };

    setDismissed(sessionStorage.getItem("pwa-install-dismissed") === "1");
    updateInstalledState();

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      if (pendingInstallClick) {
        void triggerInstallPrompt(promptEvent);
      }
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setDismissed(false);
      sessionStorage.removeItem("pwa-install-dismissed");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [pendingInstallClick]);

  const shouldShowPrompt = useMemo(() => !isInstalled && !dismissed, [dismissed, isInstalled]);
  const platformMessage = useMemo(() => {
    if (isIos()) {
      return "Sur iPhone/iPad: ouvrez le menu Partager puis 'Sur l'ecran d'accueil'.";
    }
    if (isAndroid()) {
      return "Sur Android: utilisez le bouton Installer ou le menu du navigateur.";
    }
    return "Sur PC: cliquez sur Installer ou utilisez l'option d'installation du navigateur.";
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await triggerInstallPrompt(deferredPrompt);
      return;
    }

    setPendingInstallClick(true);
    if (isIos()) {
      return;
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("pwa-install-dismissed", "1");
  };

  if (!shouldShowPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 mx-auto w-[calc(100%-2rem)] max-w-xl rounded-xl border bg-card/95 p-4 shadow-lg backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-card-foreground">
            Installez l'application sur votre appareil.
          </p>
          <p className="text-xs text-muted-foreground">{platformMessage}</p>
          {!deferredPrompt && !isIos() && (
            <p className="text-xs text-amber-700">
              Preparation de l'installation... le navigateur doit d'abord autoriser le prompt.
            </p>
          )}
          {isIos() && (
            <p className="text-xs text-muted-foreground">
              Sur iPhone/iPad, Apple ne permet pas l'installation automatique en un clic.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={handleDismiss}>
            Annuler
          </Button>
          <Button type="button" onClick={handleInstall}>
            Installer
          </Button>
        </div>
      </div>
    </div>
  );
}
