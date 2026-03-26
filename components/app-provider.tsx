"use client";

import { useEffect, useState, useCallback } from "react";
import { AppContext, AppState, House, Studio, Payment, Expense, SessionUser } from "@/lib/store";
import {
  getDashboardApi,
  addHouseApi,
  addStudioApi,
  addPaymentApi,
  addExpenseApi,
  addCommentApi,
  hasAuthState,
} from "@/lib/api";
import { getSession, refreshSession } from "@/lib/auth";

type State = { user: SessionUser | null; houses: House[]; studios: Studio[]; payments: Payment[]; expenses: Expense[] };

const initialState: State = { user: null, houses: [], studios: [], payments: [], expenses: [] };

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ ...initialState, user: getSession() });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
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
    const data = await getDashboardApi() as { houses: House[]; studios: Studio[]; payments: Payment[]; expenses: Expense[] };
    setState({ user, houses: data.houses, studios: data.studios, payments: data.payments, expenses: data.expenses });
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  const addHouse = useCallback(async (h: Omit<House, "id" | "floors" | "apartments" | "rentPrice"> & { levels: { floor: number; apartments: { number: number; rentPrice: number }[] }[] }) => {
    await addHouseApi(h);
    await refresh();
  }, [refresh]);
  const addStudio = useCallback(async (s: Omit<Studio, "id">) => {
    await addStudioApi(s);
    await refresh();
  }, [refresh]);
  const addPayment = useCallback(async (p: Omit<Payment, "id">) => {
    await addPaymentApi({
      propertyType: p.propertyType,
      propertyId: p.propertyId,
      month: p.month,
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
    });
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
    addPayment,
    addExpense,
    addComment,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
