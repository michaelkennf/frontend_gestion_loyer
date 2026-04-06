"use client";

import { useEffect, useState, useCallback } from "react";
import { AppContext, AppState, House, Studio, Land, Payment, Expense, SessionUser, Supplier } from "@/lib/store";
import {
  getDashboardApi,
  addHouseApi,
  addStudioApi,
  addLandApi,
  addPaymentApi,
  addExpenseApi,
  addSupplierApi,
  addCommentApi,
  hasAuthState,
  onAuthChanged,
} from "@/lib/api";
import { getSession, refreshSession } from "@/lib/auth";

type State = {
  user: SessionUser | null;
  houses: House[];
  studios: Studio[];
  lands: Land[];
  suppliers: Supplier[];
  payments: Payment[];
  expenses: Expense[];
};

const initialState: State = { user: null, houses: [], studios: [], lands: [], suppliers: [], payments: [], expenses: [] };

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ ...initialState, user: getSession() });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    if (!hasAuthState() && !getSession()) {
      setState(initialState);
      setLoading(false);
      return;
    }
    const user = await refreshSession();
    if (!user) {
      setState(initialState);
      setLoading(false);
      return;
    }
    const data = await getDashboardApi() as {
      houses: House[];
      studios: Studio[];
      lands?: Land[];
      suppliers?: Supplier[];
      payments: Payment[];
      expenses: Expense[];
    };
    setState({
      user,
      houses: data.houses,
      studios: data.studios,
      lands: data.lands ?? [],
      suppliers: data.suppliers ?? [],
      payments: data.payments,
      expenses: data.expenses,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const unsubscribe = onAuthChanged(() => {
      refresh().catch(() => setLoading(false));
    });
    return unsubscribe;
  }, [refresh]);

  const addHouse = useCallback(async (h: Omit<House, "id" | "floors" | "apartments" | "rentPrice" | "layout"> & { levels: { floor: number; apartments: { number: number; rentPrice: number }[] }[]; isBuilding?: boolean }) => {
    await addHouseApi(h);
    await refresh();
  }, [refresh]);
  const addStudio = useCallback(async (s: Omit<Studio, "id">) => {
    await addStudioApi(s);
    await refresh();
  }, [refresh]);
  const addLand = useCallback(async (l: Omit<Land, "id">) => {
    await addLandApi(l);
    await refresh();
  }, [refresh]);
  const addPayment = useCallback(async (p: Omit<Payment, "id">) => {
    await addPaymentApi({
      propertyType: p.propertyType,
      propertyId: p.propertyId,
      paymentKind: p.paymentKind,
      tenantName: p.tenantName,
      month: p.month,
      monthsCount: p.monthsCount ?? undefined,
      amount: p.amount,
      notes: p.notes,
      floor: p.floor ?? undefined,
      apartmentNumber: p.apartmentNumber ?? undefined,
    });
    await refresh();
  }, [refresh]);
  const addExpense = useCallback(async (e: Omit<Expense, "id">) => {
    await addExpenseApi({
      expenseType: e.expenseType,
      propertyType: e.propertyType,
      propertyId: e.propertyId,
      apartmentNumber: e.apartmentNumber,
      category: e.category,
      amount: e.amount,
      comment: e.comment,
      date: e.date,
      supplierId: e.supplierId ?? undefined,
    });
    await refresh();
  }, [refresh]);
  const addSupplier = useCallback(async (payload: { name: string; contact: string }) => {
    await addSupplierApi(payload);
    await refresh();
  }, [refresh]);
  const addComment = useCallback(async (v: { transactionType: "payment" | "expense"; transactionId: string; content: string }) => {
    await addCommentApi(v);
    await refresh();
  }, [refresh]);

  const value: AppState = {
    loading,
    ...state,
    refresh,
    addHouse,
    addStudio,
    addLand,
    addPayment,
    addExpense,
    addSupplier,
    addComment,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
