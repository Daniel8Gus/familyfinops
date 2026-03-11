# FamilyFinOps 🏠

**Personal household financial OS for two partners.**

A monorepo that gives Daniel & Shelly full programmatic access to their combined finances — spending analysis, bank balances, Telegram notifications, and more — built on top of RiseUp's internal API.

---

## Features

| Status | Feature |
|--------|---------|
| ✅ | Dual bank account support (via RiseUp) |
| ✅ | Household spending & balance commands |
| ✅ | Telegram bot with daily/monthly summaries |
| 🔜 | PayBox shared expense tracker |
| 🔜 | Analytics dashboard |
| 🔜 | Manual expense logging (Bit / PayBox / cash) |
| 🔜 | AI natural language queries |
| 🔜 | Investment tracker |

---

## Architecture

```
familyfinops/
├── packages/
│   ├── cli/          ← RiseUp CLI + Telegram bot (active)
│   ├── dashboard/    ← Analytics web app (planned)
│   └── investments/  ← Investment tracker (planned)
├── data/
│   ├── paybox.json          ← PayBox shared expenses
│   └── manual-expenses.json ← Cash / Bit / manual entries
└── docs/
    └── architecture.md
```

See [docs/architecture.md](docs/architecture.md) for a detailed breakdown.

---

## Setup

### 1. Install dependencies

```bash
git clone https://github.com/<your-username>/familyfinops.git
cd familyfinops
npm install
```

### 2. Log in to RiseUp (one-time per profile)

```bash
cd packages/cli
npx tsx src/cli.ts login --profile daniel
npx tsx src/cli.ts login --profile shelly
```

Each command opens Chrome for Google OAuth + SMS 2FA. Sessions are saved to `~/.config/riseup-cli/`.

### 3. Verify

```bash
npx tsx src/cli.ts status --profile daniel
npx tsx src/cli.ts status --profile shelly
```

---

## Usage

### CLI commands

```bash
# Household combined view
npx tsx packages/cli/src/cli.ts household balance
npx tsx packages/cli/src/cli.ts household spending --json
npx tsx packages/cli/src/cli.ts household report

# Per-profile
npx tsx packages/cli/src/cli.ts balance --profile daniel
npx tsx packages/cli/src/cli.ts spending --profile shelly --by category
```

### Telegram bot

```bash
cp packages/cli/telegram/.env.example packages/cli/telegram/.env
# Fill in TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID

npm run bot
```

Bot commands:
- `/balance` — current account balances for both partners
- `/spending` — this month's household spending by category
- `/report` — full monthly report (spending + balances)
- `/paybox` — PayBox tracker *(coming soon)*
- `/ask` — AI finance queries *(coming soon)*

### Build

```bash
npm run build       # Build packages/cli
```

---

## Roadmap

| Priority | Item |
|----------|------|
| 🔥 High | Connect Shelly's RiseUp account (`--profile shelly`) |
| 🔥 High | PayBox CSV import → `data/paybox.json` |
| 📊 Medium | Analytics dashboard (`packages/dashboard`) |
| 📊 Medium | Manual expense logging via bot (`/add 50 groceries`) |
| 🤖 Low | AI natural language queries (`/ask how much did we spend on food?`) |
| 📈 Low | Investment tracker (`packages/investments`) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22+ (ESM) |
| Language | TypeScript |
| CLI | Commander.js |
| Auth | Playwright (Chrome) |
| Bot | Telegraf v4 |
| Scheduler | node-cron |
| Build | tsup |
| Monorepo | npm workspaces |

---

## License

MIT
