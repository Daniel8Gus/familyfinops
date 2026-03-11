import { useCallback, useEffect, useState } from "react";
import {
  api,
  type Balance,
  type MonthTrend,
  type PayboxHistoryEntry,
  type PayboxStatus,
  type SpendingGroup,
  type Transaction,
  type HouseholdBalance,
  type InvestmentAccount,
} from "../api/client.ts";

export interface HouseholdData {
  balance: HouseholdBalance | null;
  spending: SpendingGroup[] | null;
  transactions: Transaction[] | null;
}

export interface PersonData {
  accounts: Balance[];
  total: number;
  spending: SpendingGroup[] | null;
  transactions: Transaction[] | null;
  trends: MonthTrend[] | null;
}

export interface FinanceState {
  household: HouseholdData & { error?: string };
  daniel: PersonData & { error?: string };
  shelly: PersonData & { error?: string };
  paybox: {
    status: PayboxStatus | null;
    monthly_target: number;
    history: PayboxHistoryEntry[] | null;
    error?: string;
  };
  investments: { accounts: InvestmentAccount[]; error?: string };
  loading: boolean;
  refresh: () => void;
  lastUpdated: Date | null;
}

const emptyHousehold: HouseholdData = {
  balance: null,
  spending: null,
  transactions: null,
};

const emptyPerson: PersonData = {
  accounts: [],
  total: 0,
  spending: null,
  transactions: null,
  trends: null,
};

function getErrorMessage(reason: unknown): string {
  if (reason && typeof reason === "object" && "response" in reason) {
    const res = (reason as { response?: { data?: { error?: string }; status?: number } }).response;
    if (res?.data?.error) return res.data.error;
    if (res?.status === 404) return "API endpoint not found.";
    if (res?.status === 401) return "Session expired. Run: riseup login --profile <name>";
  }
  if (reason instanceof Error) {
    const err = reason as Error & { code?: string };
    if (err.message === "Network Error" || err.code === "ECONNREFUSED" || err.code === "ERR_NETWORK")
      return "API not reachable. Start it with: cd packages/cli && npm run bot";
    return err.message;
  }
  return String(reason);
}

export function useFinanceData(): FinanceState {
  const [household, setHousehold] = useState<HouseholdData & { error?: string }>(emptyHousehold);
  const [daniel, setDaniel] = useState<PersonData & { error?: string }>(emptyPerson);
  const [shelly, setShelly] = useState<PersonData & { error?: string }>(emptyPerson);
  const [paybox, setPaybox] = useState<{
    status: PayboxStatus | null;
    monthly_target: number;
    history: PayboxHistoryEntry[] | null;
    error?: string;
  }>({ status: null, monthly_target: 1500, history: null });
  const [investments, setInvestments] = useState<{ accounts: InvestmentAccount[]; error?: string }>({ accounts: [] });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    const [
      hBalanceRes,
      hSpendingRes,
      hTxRes,
      dBalanceRes,
      dSpendingRes,
      dTxRes,
      dTrendsRes,
      sBalanceRes,
      sSpendingRes,
      sTxRes,
      sTrendsRes,
      payboxRes,
      historyRes,
      invRes,
    ] = await Promise.allSettled([
      api.household.balance(),
      api.household.spending(),
      api.household.transactions(),
      api.daniel.balance(),
      api.daniel.spending(),
      api.daniel.transactions(),
      api.daniel.trends(6),
      api.shelly.balance(),
      api.shelly.spending(),
      api.shelly.transactions(),
      api.shelly.trends(6),
      api.paybox.status(),
      api.paybox.history(),
      api.investments(),
    ]);

    setHousehold({
      balance:
        hBalanceRes.status === "fulfilled"
          ? {
              daniel: hBalanceRes.value.data.daniel ?? [],
              shelly: hBalanceRes.value.data.shelly ?? [],
              combined_total: hBalanceRes.value.data.combined_total ?? 0,
            }
          : null,
      spending: hSpendingRes.status === "fulfilled" ? hSpendingRes.value.data.data : null,
      transactions: hTxRes.status === "fulfilled" ? hTxRes.value.data.data : null,
      error: hBalanceRes.status === "rejected" ? getErrorMessage(hBalanceRes.reason) : undefined,
    });

    setDaniel({
      accounts: dBalanceRes.status === "fulfilled" ? dBalanceRes.value.data.accounts : [],
      total: dBalanceRes.status === "fulfilled" ? dBalanceRes.value.data.total : 0,
      spending: dSpendingRes.status === "fulfilled" ? dSpendingRes.value.data.data : null,
      transactions: dTxRes.status === "fulfilled" ? dTxRes.value.data.data : null,
      trends: dTrendsRes.status === "fulfilled" ? dTrendsRes.value.data.data : null,
      error: dBalanceRes.status === "rejected" ? getErrorMessage(dBalanceRes.reason) : undefined,
    });

    setShelly({
      accounts: sBalanceRes.status === "fulfilled" ? sBalanceRes.value.data.accounts : [],
      total: sBalanceRes.status === "fulfilled" ? sBalanceRes.value.data.total : 0,
      spending: sSpendingRes.status === "fulfilled" ? sSpendingRes.value.data.data : null,
      transactions: sTxRes.status === "fulfilled" ? sTxRes.value.data.data : null,
      trends: sTrendsRes.status === "fulfilled" ? sTrendsRes.value.data.data : null,
      error: sBalanceRes.status === "rejected" ? getErrorMessage(sBalanceRes.reason) : undefined,
    });

    setPaybox({
      status: payboxRes.status === "fulfilled" ? payboxRes.value.data.status : null,
      monthly_target: payboxRes.status === "fulfilled" ? payboxRes.value.data.monthly_target : 1500,
      history: historyRes.status === "fulfilled" ? historyRes.value.data.history : null,
      error: payboxRes.status === "rejected" ? getErrorMessage(payboxRes.reason) : undefined,
    });

    setInvestments({
      accounts: invRes.status === "fulfilled" ? invRes.value.data.data : [],
      error: invRes.status === "rejected" ? getErrorMessage(invRes.reason) : undefined,
    });

    setLoading(false);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return {
    household,
    daniel,
    shelly,
    paybox,
    investments,
    loading,
    refresh: fetchAll,
    lastUpdated,
  };
}
