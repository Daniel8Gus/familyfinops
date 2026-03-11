# FamilyFinOps — Architecture

## Overview

FamilyFinOps is an npm workspaces monorepo. Each package is independently runnable but they share the root `node_modules` and this `docs/` folder for cross-package documentation.

---

## packages/cli

The core engine. A Node.js CLI that pulls financial data from [RiseUp](https://input.riseup.co.il) (an Israeli personal finance aggregator) and a Telegram bot that delivers daily/monthly summaries.

### How bank data is pulled

1. **Authentication** — `riseup login --profile <name>` launches a persistent Chromium browser via Playwright and guides the user through Google OAuth + SMS 2FA. The resulting session cookies are saved to `~/.config/riseup-cli/session-<name>.json`.

2. **API calls** — `HttpClient` in `src/client/http.ts` reads the saved cookies and sends them as a `Cookie` header on every request to `https://input.riseup.co.il/api/...`. The `COMMIT-HASH` and `RISEUP-PLATFORM: WEB` headers are required by the API to mimic the web app.

3. **Budget data** — The primary data source is `GET /api/budget/<YYYY-MM>/1`, which returns an envelope-based budget containing all transactions for the month. The CLI flattens envelope actuals into a flat transaction list.

4. **Balance data** — `GET /api/balance` returns current account balances across all connected bank accounts.

### Dual-profile support (`--profile`)

Each person (Daniel / Shelly) has their own RiseUp account. The `--profile` flag selects which session file to load:

```
~/.config/riseup-cli/session-daniel.json
~/.config/riseup-cli/session-shelly.json
```

All CLI commands accept `--profile <name>`. The `household` commands internally load **both** profiles in parallel and merge the results.

### Telegram bot layer

`telegram/` is a lightweight layer on top of the CLI's data functions:

- `bot.ts` — Telegraf bot. Commands `/balance`, `/spending`, `/report` call `fetchHouseholdBalanceData()`, `fetchHouseholdSpendingData()`, `fetchHouseholdReportData()` from `src/commands/household.ts` directly (no subprocess).
- `formatter.ts` — Converts structured data to Telegram HTML messages with emoji category icons.
- `scheduler.ts` — `node-cron` jobs: daily balance at 09:00, monthly report on the 1st at 08:00.
- `index.ts` — Entry point. Loads `telegram/.env`, starts bot and scheduler.

Run with: `npm run bot` (from `packages/cli/`) or `npm run bot` (from root).

---

## data/

Shared JSON files for manual tracking of expenses not captured by bank scraping:

- `paybox.json` — Future PayBox integration entries
- `manual-expenses.json` — Cash / Bit transfers logged manually

These are committed to the repo so both partners stay in sync.

---

## packages/dashboard (planned)

A web analytics dashboard that reads from the same RiseUp API (or pre-fetched JSON snapshots) and presents:
- Month-over-month spending trends
- Per-partner vs shared spending
- Savings progress charts

Tech stack TBD (likely React + Vite or Next.js).

---

## packages/investments (planned)

An investment tracker that aggregates:
- Securities from RiseUp's financial summary API
- Manual entries for assets not tracked by RiseUp
- Net worth over time

---

## Data flow

```
RiseUp API
    │
    ▼
packages/cli/src/client/    ← HttpClient + RiseUpClient
    │
    ├── CLI commands         ← riseup balance / spending / household ...
    │
    ├── Telegram bot         ← /balance /spending /report
    │       │
    │       └── formatter    ← HTML messages
    │
    └── (future) dashboard   ← packages/dashboard reads same client
```
