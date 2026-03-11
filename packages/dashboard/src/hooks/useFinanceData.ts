import { useCallback, useEffect, useState } from "react";
import { api, type Balance, type MonthTrend, type PayboxHistoryEntry, type PayboxStatus, type SpendingGroup, type Transaction } from "../api/client.ts";

export interface FinanceData {
  balance: { accounts: Balance[]; total: number } | null;
  spending: SpendingGroup[] | null;
  transactions: Transaction[] | null;
  trends: MonthTrend[] | null;
  payboxStatus: PayboxStatus | null;
  payboxTarget: number;
  payboxHistory: PayboxHistoryEntry[] | null;
}

export interface FinanceState {
  data: FinanceData;
  loading: boolean;
  errors: Partial<Record<keyof FinanceData, string>>;
  refresh: () => void;
  lastUpdated: Date | null;
}

const EMPTY: FinanceData = {
  balance: null,
  spending: null,
  transactions: null,
  trends: null,
  payboxStatus: null,
  payboxTarget: 1500,
  payboxHistory: null,
};

export function useFinanceData(): FinanceState {
  const [data, setData] = useState<FinanceData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof FinanceData, string>>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const newErrors: Partial<Record<keyof FinanceData, string>> = {};

    const [balanceRes, spendingRes, txRes, trendsRes, payboxRes, historyRes] =
      await Promise.allSettled([
        api.daniel.balance(),
        api.daniel.spending(),
        api.daniel.transactions(),
        api.daniel.trends(6),
        api.paybox.status(),
        api.paybox.history(),
      ]);

    const newData: FinanceData = { ...EMPTY };

    if (balanceRes.status === "fulfilled") {
      newData.balance = {
        accounts: balanceRes.value.data.accounts,
        total: balanceRes.value.data.total,
      };
    } else {
      newErrors.balance = "Could not load balance";
    }

    if (spendingRes.status === "fulfilled") {
      newData.spending = spendingRes.value.data.data;
    } else {
      newErrors.spending = "Could not load spending";
    }

    if (txRes.status === "fulfilled") {
      newData.transactions = txRes.value.data.data;
    } else {
      newErrors.transactions = "Could not load transactions";
    }

    if (trendsRes.status === "fulfilled") {
      newData.trends = trendsRes.value.data.data;
    } else {
      newErrors.trends = "Could not load trends";
    }

    if (payboxRes.status === "fulfilled") {
      newData.payboxStatus = payboxRes.value.data.status;
      newData.payboxTarget = payboxRes.value.data.monthly_target;
    } else {
      newErrors.payboxStatus = "Could not load PayBox";
    }

    if (historyRes.status === "fulfilled") {
      newData.payboxHistory = historyRes.value.data.history;
    } else {
      newErrors.payboxHistory = "Could not load PayBox history";
    }

    setData(newData);
    setErrors(newErrors);
    setLoading(false);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return { data, loading, errors, refresh: fetchAll, lastUpdated };
}
