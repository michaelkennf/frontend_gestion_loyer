"use client";

import { clearAuthState, getRememberMe, loginApi, logoutApi, meApi, notifyAuthChanged, setRememberMe } from "@/lib/api";
import type { SessionUser } from "@/lib/store";

const SESSION_KEY = "rent-app-session";

export async function login(username: string, password: string, rememberMe = false): Promise<SessionUser> {
  setRememberMe(rememberMe);
  const user = await loginApi(username, password);
  // Write SESSION_KEY BEFORE notifying listeners so that AppProvider.refresh()
  // finds getSession() populated and can show stale cached data immediately.
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  notifyAuthChanged();
  return user;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  logoutApi();
}

export async function refreshSession(): Promise<SessionUser | null> {
  try {
    const user = await meApi();
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  } catch (error) {
    if (getRememberMe() && typeof window !== "undefined" && !window.navigator.onLine) {
      return getSession();
    }
    if (error instanceof Error && /connexion indisponible/i.test(error.message)) {
      return getSession();
    }
    clearAuthState();
    return null;
  }
}

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}

export type { SessionUser };
