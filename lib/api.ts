"use client";

import type { SessionUser } from "@/lib/store";
import {
  addOfflineMutation,
  countOfflineMutations,
  deleteOfflineMutations,
  listOfflineMutations,
  type OfflineMutation,
  type SerializedBody,
  type OfflineFormDataEntry,
} from "@/lib/offline-queue-db";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const TOKEN_KEY = "rent-app-token";
const REFRESH_TOKEN_KEY = "rent-app-refresh-token";
const AUTH_DEBUG = process.env.NEXT_PUBLIC_AUTH_DEBUG === "1" || process.env.NODE_ENV !== "production";
const AUTH_CHANGED_EVENT = "rent-auth-changed";
const OFFLINE_QUEUE_EVENT = "rent-offline-queue-changed";
const DASHBOARD_CACHE_KEY = "rent-dashboard-cache-v1";

function notifyAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

function notifyOfflineQueueChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OFFLINE_QUEUE_EVENT));
}

export async function getOfflineQueueCount() {
  if (typeof window === "undefined" || !("indexedDB" in window)) return 0;
  try {
    return await countOfflineMutations();
  } catch {
    return 0;
  }
}

export function onOfflineQueueChanged(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(OFFLINE_QUEUE_EVENT, handler);
  return () => window.removeEventListener(OFFLINE_QUEUE_EVENT, handler);
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function hasAuthState() {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY));
}

function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function cacheDashboardData(data: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(data));
}

function readCachedDashboardData<T>() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(DASHBOARD_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
    document.cookie = "rent_auth=; path=/; max-age=0";
  } else {
    localStorage.setItem(TOKEN_KEY, token);
    document.cookie = "rent_auth=1; path=/; samesite=lax";
  }
}

function setRefreshToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (!token) localStorage.removeItem(REFRESH_TOKEN_KEY);
  else localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

function setRoleCookie(role: string | null) {
  if (typeof window === "undefined") return;
  if (!role) document.cookie = "rent_role=; path=/; max-age=0";
  else document.cookie = `rent_role=${role}; path=/; samesite=lax`;
}

export function clearAuthState() {
  setToken(null);
  setRefreshToken(null);
  setRoleCookie(null);
  if (typeof window !== "undefined") {
    localStorage.removeItem("rent-app-session");
  }
  notifyAuthChanged();
}

function canQueueOffline(path: string, method?: string) {
  if (!method || method === "GET") return false;
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return false;
  return (
    path.startsWith("/properties") ||
    path.startsWith("/payments") ||
    path.startsWith("/expenses") ||
    path.startsWith("/suppliers") ||
    path.startsWith("/rental-deposits") ||
    path.startsWith("/comments")
  );
}

async function serializeBody(body: RequestInit["body"]): Promise<SerializedBody> {
  if (!body) return { kind: "none" };
  if (typeof body === "string") return { kind: "json", value: body };
  if (body instanceof FormData) {
    const entries: OfflineFormDataEntry[] = [];
    for (const [key, value] of body.entries()) {
      if (typeof value === "string") {
        entries.push({ key, type: "text", value });
        continue;
      }
      entries.push({
        key,
        type: "file",
        name: value.name || "upload.bin",
        mimeType: value.type || "application/octet-stream",
        file: value,
      });
    }
    return { kind: "form-data", entries };
  }
  throw new Error("Type de requete non pris en charge en mode hors ligne.");
}

function deserializeBody(body: SerializedBody): RequestInit["body"] | undefined {
  if (body.kind === "none") return undefined;
  if (body.kind === "json") return body.value;
  const formData = new FormData();
  for (const entry of body.entries) {
    if (entry.type === "text") {
      formData.append(entry.key, entry.value);
      continue;
    }
    formData.append(entry.key, entry.file, entry.name);
  }
  return formData;
}

async function enqueueOfflineMutation(path: string, method: OfflineMutation["method"], body: SerializedBody) {
  const mutationId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await addOfflineMutation({
    id: mutationId,
    createdAt: Date.now(),
    path,
    method,
    body,
  });
  notifyOfflineQueueChanged();
  return mutationId;
}

async function rawFetch(path: string, init?: RequestInit, idempotencyKey?: string) {
  const token = getToken();
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  return fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
      ...(init?.headers || {}),
    },
  });
}

async function request<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const shouldAttachIdempotency = canQueueOffline(path, method);
  const requestIdempotencyKey = shouldAttachIdempotency ? `${Date.now()}-${Math.random().toString(36).slice(2, 12)}` : undefined;
  let res: Response;
  try {
    res = await rawFetch(path, init, requestIdempotencyKey);
  } catch {
    if (method === "GET" && path === "/dashboard") {
      const cached = readCachedDashboardData<T>();
      if (cached) return cached;
    }
    if (canQueueOffline(path, method)) {
      const serializedBody = await serializeBody(init?.body);
      await addOfflineMutation({
        id: requestIdempotencyKey!,
        createdAt: Date.now(),
        path,
        method: method as OfflineMutation["method"],
        body: serializedBody,
      });
      notifyOfflineQueueChanged();
      return { queuedOffline: true } as T;
    }
    throw new Error("Connexion indisponible.");
  }

  if (res.status === 401 && retry && path !== "/auth/login") {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        const refreshed = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshed.ok) {
          const data = await refreshed.json() as { token: string; refreshToken: string };
          setToken(data.token);
          setRefreshToken(data.refreshToken);
          return request<T>(path, init, false);
        }
      } catch {
        // noop
      }
    }
    clearAuthState();
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok && AUTH_DEBUG && path.startsWith("/auth")) {
    console.warn("[AUTH_DEBUG] request_failed", {
      path,
      status: res.status,
      message: (data as { message?: string })?.message ?? "unknown",
    });
  }
  if (!res.ok) throw new Error(data.message || "Erreur API");
  if (method === "GET" && path === "/dashboard") {
    cacheDashboardData(data);
  }
  return data as T;
}

export async function syncOfflineQueue() {
  if (typeof window === "undefined" || !window.navigator.onLine) return;
  if (!("indexedDB" in window)) return;
  const token = getToken();
  if (!token) return;
  const queue = await listOfflineMutations();
  if (queue.length === 0) return;

  const toDelete: string[] = [];
  for (const item of queue) {
    try {
      const response = await rawFetch(item.path, {
        method: item.method,
        body: deserializeBody(item.body),
      }, item.id);
      if (response.status === 401) {
        break;
      }
      if (!response.ok && response.status < 500) {
        // Skip invalid payloads to avoid blocking the full queue.
        toDelete.push(item.id);
        continue;
      }
      if (response.ok) {
        toDelete.push(item.id);
      }
    } catch {
      break;
    }
  }
  await deleteOfflineMutations(toDelete);
  notifyOfflineQueueChanged();
}

export async function loginApi(username: string, password: string) {
  const data = await request<{ token: string; refreshToken: string; user: SessionUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  setRefreshToken(data.refreshToken);
  setRoleCookie(data.user.role);
  notifyAuthChanged();
  return data.user;
}

export function onAuthChanged(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(AUTH_CHANGED_EVENT, handler);
  return () => window.removeEventListener(AUTH_CHANGED_EVENT, handler);
}

export function logoutApi() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    void fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  }
  clearAuthState();
}

export async function meApi() {
  return request<SessionUser>("/auth/me");
}

export async function changePasswordApi(currentPassword: string, newPassword: string, confirmPassword: string) {
  return request<{ message: string }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });
}

export async function getDashboardApi() {
  return request("/dashboard");
}

export async function upsertRentalDepositApi(payload: {
  propertyType: "house" | "building" | "studio" | "land";
  propertyId: string;
  tenantName: string;
  balance: number;
  notes?: string;
  floor?: number;
  apartmentNumber?: number;
}) {
  return request("/rental-deposits", { method: "POST", body: JSON.stringify(payload) });
}

export async function deleteRentalDepositApi(id: string) {
  return request(`/rental-deposits/${id}`, { method: "DELETE" });
}

export async function createRentalDepositTransactionApi(depositId: string, payload: {
  kind: "expense" | "refund";
  amount: number;
  comment?: string;
}) {
  return request(`/rental-deposits/${depositId}/transactions`, { method: "POST", body: JSON.stringify(payload) });
}

export async function addHouseApi(payload: {
  address: string;
  levels: { floor: number; apartments: { number: number; rentPrice: number }[] }[];
  isBuilding?: boolean;
}) {
  return request("/properties/houses", { method: "POST", body: JSON.stringify(payload) });
}

export async function addStudioApi(payload: { address: string; monthlyRent: number }) {
  return request("/properties/studios", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateHouseApi(houseId: string, payload: {
  address: string;
  levels: { floor: number; apartments: { number: number; rentPrice: number }[] }[];
}) {
  return request(`/properties/houses/${houseId}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteHouseApi(houseId: string) {
  return request(`/properties/houses/${houseId}`, { method: "DELETE" });
}

export async function updateStudioApi(studioId: string, payload: { address: string; monthlyRent: number }) {
  return request(`/properties/studios/${studioId}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteStudioApi(studioId: string) {
  return request(`/properties/studios/${studioId}`, { method: "DELETE" });
}

export async function addLandApi(payload: { address: string; size: number; monthlyRent: number }) {
  return request("/properties/lands", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateLandApi(landId: string, payload: { address: string; size: number; monthlyRent: number }) {
  return request(`/properties/lands/${landId}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteLandApi(landId: string) {
  return request(`/properties/lands/${landId}`, { method: "DELETE" });
}

export async function addPaymentApi(payload: {
  propertyType: "house" | "building" | "studio" | "land";
  propertyId: string;
  paymentKind: "rental" | "monthly";
  tenantName: string;
  month?: string;
  monthsCount?: number;
  amount: number;
  notes?: string;
  floor?: number;
  apartmentNumber?: number;
  contractFile?: File | null;
}) {
  const body = new FormData();
  body.append("propertyType", payload.propertyType);
  body.append("propertyId", payload.propertyId);
  body.append("paymentKind", payload.paymentKind);
  body.append("tenantName", payload.tenantName);
  if (payload.month) body.append("month", payload.month);
  if (typeof payload.monthsCount === "number") body.append("monthsCount", String(payload.monthsCount));
  body.append("amount", String(payload.amount));
  if (payload.notes) body.append("notes", payload.notes);
  if (typeof payload.floor === "number") body.append("floor", String(payload.floor));
  if (typeof payload.apartmentNumber === "number") body.append("apartmentNumber", String(payload.apartmentNumber));
  if (payload.contractFile) body.append("contractFile", payload.contractFile);
  return request("/payments", { method: "POST", body });
}

export async function updatePaymentApi(paymentId: string, payload: {
  month?: string;
  monthsCount?: number;
  notes?: string;
  paymentKind?: "rental" | "monthly";
  tenantName?: string;
  floor?: number;
  apartmentNumber?: number;
  amount?: number;
}) {
  return request(`/payments/${paymentId}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deletePaymentApi(paymentId: string) {
  return request(`/payments/${paymentId}`, { method: "DELETE" });
}

export async function addExpenseApi(payload: {
  expenseType: "common" | "private";
  propertyType: "house" | "building" | "studio" | "land";
  propertyId?: string;
  apartmentNumber?: string;
  category: string;
  amount: number;
  comment?: string;
  date: string;
  supplierId?: string;
}) {
  return request("/expenses", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateExpenseApi(expenseId: string, payload: {
  category: string;
  amount: number;
  comment?: string;
  date: string;
  apartmentNumber?: string;
  supplierId?: string | null;
}) {
  return request(`/expenses/${expenseId}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function addSupplierApi(payload: { name: string; contact: string }) {
  return request<{ id: string; name: string; contact: string }>("/suppliers", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateSupplierApi(supplierId: string, payload: { name: string; contact: string }) {
  return request<{ id: string; name: string; contact: string }>(`/suppliers/${supplierId}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteSupplierApi(supplierId: string) {
  return request<{ message: string }>(`/suppliers/${supplierId}`, { method: "DELETE" });
}

export async function deleteExpenseApi(expenseId: string) {
  return request(`/expenses/${expenseId}`, { method: "DELETE" });
}

export async function addCommentApi(payload: { transactionType: "payment" | "expense"; transactionId: string; content: string }) {
  return request("/comments", { method: "POST", body: JSON.stringify(payload) });
}

export async function listUsersApi() {
  return request<Array<{ id: string; username: string; fullName: string; role: "ADMIN" | "MANAGER" | "OWNER"; forceReset: boolean; createdAt: string }>>("/users");
}

export async function createUserApi(payload: { username: string; fullName: string; role: "ADMIN" | "MANAGER" | "OWNER"; password: string; forceReset?: boolean }) {
  return request("/users", { method: "POST", body: JSON.stringify(payload) });
}

export async function resetPasswordApi(userId: string, newPassword: string) {
  return request(`/users/${userId}/reset-password`, { method: "POST", body: JSON.stringify({ newPassword }) });
}
