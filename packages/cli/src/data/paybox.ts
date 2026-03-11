import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

// ── Path resolution ───────────────────────────
// This file: packages/cli/src/data/paybox.ts
// Go 4 levels up to reach repo root, then into data/
const __filename = fileURLToPath(import.meta.url);
export const PAYBOX_PATH = resolve(
  dirname(__filename),
  "../../../../data/paybox.json",
);

// ── Types ─────────────────────────────────────

export interface PayboxContribution {
  id: string;
  date: string; // YYYY-MM-DD
  who: "daniel" | "shelly";
  amount: number;
  note?: string;
  telegram_user_id: number;
}

export interface PayboxPayment {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  category: string;
  note?: string;
  logged_by: string;
}

export interface PayboxData {
  monthly_target: number;
  contributions: PayboxContribution[];
  payments: PayboxPayment[];
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

// ── I/O ───────────────────────────────────────

export async function loadPaybox(): Promise<PayboxData> {
  try {
    const raw = await readFile(PAYBOX_PATH, "utf-8");
    return JSON.parse(raw) as PayboxData;
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") {
      return { monthly_target: 1500, contributions: [], payments: [] };
    }
    throw err;
  }
}

async function savePaybox(data: PayboxData): Promise<void> {
  await mkdir(dirname(PAYBOX_PATH), { recursive: true });
  await writeFile(PAYBOX_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// ── Status calculation ────────────────────────

export function calcStatus(data: PayboxData): PayboxStatus {
  const currentMonth = new Date().toISOString().slice(0, 7);

  const mc = data.contributions.filter((c) => c.date.startsWith(currentMonth));
  const mp = data.payments.filter((p) => p.date.startsWith(currentMonth));

  const danielTotal = mc
    .filter((c) => c.who === "daniel")
    .reduce((s, c) => s + c.amount, 0);
  const shellyTotal = mc
    .filter((c) => c.who === "shelly")
    .reduce((s, c) => s + c.amount, 0);
  const totalContributed = danielTotal + shellyTotal;
  const totalPaid = mp.reduce((s, p) => s + p.amount, 0);
  const balance = totalContributed - totalPaid;
  const stillNeeded = Math.max(0, data.monthly_target - totalContributed);

  return {
    balance,
    danielTotal,
    shellyTotal,
    totalContributed,
    totalPaid,
    stillNeeded,
    currentMonth,
  };
}

// ── Mutations ─────────────────────────────────

export async function addContribution(
  who: "daniel" | "shelly",
  amount: number,
  telegramUserId: number,
  note?: string,
): Promise<{ data: PayboxData; status: PayboxStatus }> {
  const data = await loadPaybox();
  const entry: PayboxContribution = {
    id: randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    who,
    amount,
    telegram_user_id: telegramUserId,
    ...(note && { note }),
  };
  data.contributions.push(entry);
  await savePaybox(data);
  return { data, status: calcStatus(data) };
}

export async function addPayment(
  amount: number,
  category: string,
  loggedBy: string,
  note?: string,
): Promise<{ data: PayboxData; status: PayboxStatus }> {
  const data = await loadPaybox();
  const entry: PayboxPayment = {
    id: randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    amount,
    category,
    logged_by: loggedBy,
    ...(note && { note }),
  };
  data.payments.push(entry);
  await savePaybox(data);
  return { data, status: calcStatus(data) };
}

/** Last N transactions (contributions + payments) sorted by date desc. */
export async function getHistory(
  limit = 10,
): Promise<Array<{ type: "contribution" | "payment"; date: string; amount: number; who?: string; category?: string; note?: string }>> {
  const data = await loadPaybox();

  const contribs = data.contributions.map((c) => ({
    type: "contribution" as const,
    date: c.date,
    amount: c.amount,
    who: c.who,
    note: c.note,
  }));
  const payments = data.payments.map((p) => ({
    type: "payment" as const,
    date: p.date,
    amount: p.amount,
    category: p.category,
    note: p.note,
    who: p.logged_by,
  }));

  return [...contribs, ...payments]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}
