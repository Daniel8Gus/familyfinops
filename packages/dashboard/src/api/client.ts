import axios from "axios";

const http = axios.create({ baseURL: "/api", timeout: 15000 });

// ── Types ─────────────────────────────────────

export interface Balance {
  _id: string;
  accountNumberPiiValue?: string;
  credentialsName: string;
  source: string;
  balance: number;
  lastUpdated: string;
}

export interface SpendingGroup {
  name: string;
  total: number;
  count: number;
  daniel: number;
  shelly: number;
}

export interface Transaction {
  date: string;
  amount: number;
  businessName: string;
  category: string;
  source: string;
  isIncome: boolean;
}

export interface MonthTrend {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface PayboxStatus {
  balance: number;
  danielTotal: number;
  shellyTotal: number;
  totalContributed: number;
  totalPaid: number;
  stillNeeded: number;
  currentMonth: string;
}

export interface PayboxHistoryEntry {
  type: "contribution" | "payment";
  date: string;
  amount: number;
  who?: string;
  category?: string;
  note?: string;
}

export interface InvestmentPosition {
  name: string;
  units: number;
  avgBuyPrice: number;
  fundType: string;
}

export interface InvestmentAccount {
  id: string;
  name: string;
  product: string;
  owner: "daniel" | "shelly";
  source: string;
  totalValue: number;
  lastUpdated: string;
  positions: InvestmentPosition[];
}

export interface HouseholdBalance {
  daniel: Balance[];
  shelly: Balance[];
  combined_total: number;
}

// ── API calls ─────────────────────────────────

export const api = {
  daniel: {
    balance: () =>
      http.get<{ ok: boolean; accounts: Balance[]; total: number }>("/daniel/balance"),
    spending: (month?: string) =>
      http.get<{ ok: boolean; data: SpendingGroup[] }>("/daniel/spending", {
        params: month ? { month } : {},
      }),
    transactions: (month?: string) =>
      http.get<{ ok: boolean; data: Transaction[] }>("/daniel/transactions", {
        params: month ? { month } : {},
      }),
    trends: (months = 6) =>
      http.get<{ ok: boolean; data: MonthTrend[] }>("/daniel/trends", {
        params: { months },
      }),
  },
  household: {
    balance: () =>
      http.get<HouseholdBalance & { ok: boolean }>("/household/balance"),
    spending: (month?: string) =>
      http.get<{ ok: boolean; data: SpendingGroup[] }>("/household/spending", {
        params: month ? { month } : {},
      }),
    transactions: (month?: string) =>
      http.get<{ ok: boolean; data: Transaction[] }>("/household/transactions", {
        params: month ? { month } : {},
      }),
  },
  shelly: {
    balance: () =>
      http.get<{ ok: boolean; accounts: Balance[]; total: number }>("/shelly/balance"),
    spending: (month?: string) =>
      http.get<{ ok: boolean; data: SpendingGroup[] }>("/shelly/spending", {
        params: month ? { month } : {},
      }),
    transactions: (month?: string) =>
      http.get<{ ok: boolean; data: Transaction[] }>("/shelly/transactions", {
        params: month ? { month } : {},
      }),
    trends: (months = 6) =>
      http.get<{ ok: boolean; data: MonthTrend[] }>("/shelly/trends", {
        params: { months },
      }),
  },
  investments: () =>
    http.get<{ ok: boolean; data: InvestmentAccount[] }>("/investments"),
  paybox: {
    status: () =>
      http.get<{ ok: boolean; status: PayboxStatus; monthly_target: number }>(
        "/paybox/status",
      ),
    history: () =>
      http.get<{ ok: boolean; history: PayboxHistoryEntry[] }>("/paybox/history"),
    contribute: (who: "daniel" | "shelly", amount: number, note?: string) =>
      http.post<{ ok: boolean; status: PayboxStatus }>("/paybox/contribute", {
        who,
        amount,
        note,
      }),
    pay: (amount: number, category: string, note?: string, logged_by = "daniel") =>
      http.post<{ ok: boolean; status: PayboxStatus }>("/paybox/pay", {
        amount,
        category,
        note,
        logged_by,
      }),
  },
};
