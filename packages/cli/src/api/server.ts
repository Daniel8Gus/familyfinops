import express from "express";
import {
  loadPaybox,
  addContribution,
  addPayment,
  calcStatus,
  getHistory,
} from "../data/paybox.js";

/**
 * Create the FamilyFinOps REST API server.
 *
 * Routes:
 *   GET  /api/paybox/status    → current balance, contributions, payments this month
 *   GET  /api/paybox/history   → last 30 transactions
 *   POST /api/paybox/contribute { who, amount, note? }
 *   POST /api/paybox/pay       { amount, category, note?, logged_by }
 */
export function createApiServer() {
  const app = express();
  app.use(express.json());

  // ── GET /api/paybox/status ─────────────────
  app.get("/api/paybox/status", async (_req, res) => {
    try {
      const data = await loadPaybox();
      const status = calcStatus(data);
      res.json({ ok: true, status, monthly_target: data.monthly_target });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // ── GET /api/paybox/history ────────────────
  app.get("/api/paybox/history", async (_req, res) => {
    try {
      const history = await getHistory(30);
      res.json({ ok: true, history });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // ── POST /api/paybox/contribute ───────────
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

  // ── POST /api/paybox/pay ──────────────────
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

  return app;
}

export function startApiServer(port = 3001): void {
  const app = createApiServer();
  app.listen(port, () => {
    console.log(`FamilyFinOps API listening on http://localhost:${port}`);
  });
}
