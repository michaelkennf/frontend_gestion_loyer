"use client";

import { clearAuthState, loginApi, logoutApi, meApi } from "@/lib/api";
import type { SessionUser } from "@/lib/store";

const SESSION_KEY = "rent-app-session";

export async function login(username: string, password: string): Promise<SessionUser> {
  const user = await loginApi(username, password);
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
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
  } catch {
    clearAuthState();
    return null;
  }
}

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}
