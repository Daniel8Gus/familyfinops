import cors from "cors";
import express from "express";
import {
  loadPaybox,
  addContribution,
  addPayment,
  calcStatus,
  getHistory,
} from "../data/paybox.js";
import {
  fetchHouseholdBalanceData,
  fetchHouseholdSpendingData,
  fetchDanielTransactions,
  fetchDanielTrends,
} from "../commands/household.js";

const NO_SESSION_MSG = "No sessions found for any household profile.";

function isNoSessionError(err: unknown): boolean {
  return err instanceof Error && err.message === NO_SESSION_MSG;
}

export function createApiServer() {
  const app = express();
  app.use(
    cors({
      origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:4173",
      ],
    }),
  );
  app.use(express.json());

  // ── PayBox ────────────────────────────────────

  app.get("/api/paybox/status", async (_req, res) => {
    try {
      const data = await loadPaybox();
      const status = calcStatus(data);
      res.json({ ok: true, status, monthly_target: data.monthly_target });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.get("/api/paybox/history", async (_req, res) => {
    try {
      const history = await getHistory(30);
      res.json({ ok: true, history });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.post("/api/paybox/contribute", async (req, res) => {
    const { who, amount, note } = req.body as {
      who: "daniel" | "shelly";
      amount: number;
      note?: string;
    };
    if (!who || !["daniel", "shelly"].includes(who)) {
      res.status(400).json({ ok: false, error: "who must be 'daniel' or 'shelly'" });
      return;
    }
    if (typeof amount !== "number" || amount <= 0) {
      res.status(400).json({ ok: false, error: "amount must be a positive number" });
      return;
    }
    try {
      const result = await addContribution(who, amount, 0, note);
      res.json({ ok: true, status: result.status });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.post("/api/paybox/pay", async (req, res) => {
    const { amount, category, note, logged_by } = req.body as {
      amount: number;
      category: string;
      note?: string;
      logged_by: string;
    };
    if (typeof amount !== "number" || amount <= 0) {
      res.status(400).json({ ok: false, error: "amount must be a positive number" });
      return;
    }
    if (!category) {
      res.status(400).json({ ok: false, error: "category is required" });
      return;
    }
    try {
      const result = await addPayment(amount, category, logged_by ?? "api", note);
      res.json({ ok: true, status: result.status });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // ── Daniel's RiseUp data ──────────────────────

  app.get("/api/daniel/balance", async (_req, res) => {
    try {
      const data = await fetchHouseholdBalanceData();
      const total = data.daniel.reduce((s, b) => s + b.balance, 0);
      res.json({ ok: true, accounts: data.daniel, total });
    } catch (err) {
      if (isNoSessionError(err)) {
        res.json({ ok: true, accounts: [], total: 0 });
        return;
      }
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.get("/api/daniel/spending", async (req, res) => {
    try {
      const month = req.query["month"] as string | undefined;
      const data = await fetchHouseholdSpendingData(month);
      res.json({ ok: true, data });
    } catch (err) {
      if (isNoSessionError(err)) {
        res.json({ ok: true, data: [] });
        return;
      }
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.get("/api/daniel/transactions", async (req, res) => {
    try {
      const month = req.query["month"] as string | undefined;
      const txs = await fetchDanielTransactions(month);
      const simplified = txs.map((tx) => ({
        date: tx.transactionDate,
        amount: tx.isIncome
          ? (tx.incomeAmount ?? 0)
          : Math.abs(tx.billingAmount ?? 0),
        businessName: tx.businessName,
        category: tx.expense,
        source: tx.source,
        isIncome: tx.isIncome,
      }));
      res.json({ ok: true, data: simplified });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.get("/api/daniel/trends", async (req, res) => {
    try {
      const months = parseInt((req.query["months"] as string) ?? "6", 10);
      const data = await fetchDanielTrends(months);
      res.json({ ok: true, data });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  return app;
}

export function startApiServer(port = 3001): void {
  const app = createApiServer();
  app.listen(port, () => {
    console.log(`FamilyFinOps API listening on http://localhost:${port}`);
  });
}
