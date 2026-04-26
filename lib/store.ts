"use client";

import { createContext, useContext } from "react";

export type CommentItem = {
  id: string;
  content: string;
  author: string;
  createdAt: string;
};

export type HouseLevel = {
  floor: number;
  apartments: { number: number; rentPrice: number }[];
};

export type House = {
  id: string;
  address: string;
  floors: number;
  apartments: number;
  rentPrice: number;
  layout: HouseLevel[];
  /** true = immeuble, false ou absent = maison */
  isBuilding?: boolean;
};

export type Studio = {
  id: string;
  address: string;
  monthlyRent: number;
};

export type Land = {
  id: string;
  address: string;
  size: number;
  monthlyRent: number;
};

export type Supplier = {
  id: string;
  name: string;
  contact: string;
};

export type Payment = {
  id: string;
  propertyId: string;
  propertyType: "house" | "building" | "studio" | "land";
  propertyLabel: string;
  paymentKind: "rental" | "monthly";
  tenantName: string;
  contractFileUrl?: string;
  month: string;
  monthsCount?: number | null;
  amount: number;
  date: string;
  notes?: string;
  floor?: number | null;
  apartmentNumber?: number | null;
  comments?: CommentItem[];
};

export type Expense = {
  id: string;
  expenseType: "common" | "private";
  propertyId?: string;
  propertyType: "house" | "building" | "studio" | "land";
  propertyLabel: string;
  apartmentNumber?: string;
  category: string;
  amount: number;
  comment?: string;
  date: string;
  supplierId?: string | null;
  supplierName?: string | null;
  supplierContact?: string | null;
  comments?: CommentItem[];
};

export type RentalDeposit = {
  id: string;
  propertyId: string;
  propertyType: "house" | "building" | "studio" | "land";
  propertyLabel: string;
  tenantName: string;
  balance: number;
  floor?: number | null;
  apartmentNumber?: number | null;
  notes?: string;
  updatedAt: string;
};

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  role: "ADMIN" | "MANAGER" | "OWNER";
  forceReset: boolean;
};

export type AppState = {
  loading: boolean;
  isOnline: boolean;
  pendingSyncCount: number;
  syncingOfflineQueue: boolean;
  user: SessionUser | null;
  houses: House[];
  studios: Studio[];
  lands: Land[];
  suppliers: Supplier[];
  payments: Payment[];
  expenses: Expense[];
  rentalDeposits: RentalDeposit[];
  refresh: () => Promise<void>;
  addHouse: (h: Omit<House, "id" | "floors" | "apartments" | "rentPrice" | "layout"> & { levels: HouseLevel[]; isBuilding?: boolean }) => Promise<void>;
  addStudio: (s: Omit<Studio, "id">) => Promise<void>;
  addLand: (l: Omit<Land, "id">) => Promise<void>;
  addPayment: (p: Omit<Payment, "id">) => Promise<void>;
  addExpense: (e: Omit<Expense, "id">) => Promise<void>;
  addSupplier: (payload: { name: string; contact: string }) => Promise<void>;
  addComment: (v: { transactionType: "payment" | "expense"; transactionId: string; content: string }) => Promise<void>;
  upsertRentalDeposit: (payload: {
    propertyType: "house" | "building" | "studio" | "land";
    propertyId: string;
    tenantName: string;
    balance: number;
    notes?: string;
    floor?: number;
    apartmentNumber?: number;
  }) => Promise<void>;
  deleteRentalDeposit: (id: string) => Promise<void>;
  debitRentalDeposit: (payload: { id: string; kind: "expense" | "refund"; amount: number; comment?: string }) => Promise<void>;
};

export const AppContext = createContext<AppState | null>(null);

export function useAppStore(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppStore must be used within AppProvider");
  return ctx;
}
