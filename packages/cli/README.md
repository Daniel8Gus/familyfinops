# @familyfinops/cli

Unofficial RiseUp Finance CLI with household multi-profile support and a Telegram bot.

Part of the [FamilyFinOps](../../README.md) monorepo.

## Prerequisites

- Node.js >= 22
- Google Chrome (for login)
- A [RiseUp](https://input.riseup.co.il) account (Israeli personal finance app)

## Setup

```bash
# From repo root
npm install

# Log in for each profile
npx tsx src/cli.ts login --profile daniel
npx tsx src/cli.ts login --profile shelly
```

## CLI usage

```bash
# Per-profile commands
npx tsx src/cli.ts balance --profile daniel
npx tsx src/cli.ts spending --profile shelly --json
npx tsx src/cli.ts transactions --profile daniel
npx tsx src/cli.ts status --profile daniel

# Household (combined) commands
npx tsx src/cli.ts household balance
npx tsx src/cli.ts household spending --json
npx tsx src/cli.ts household report --json
```

## Telegram bot

```bash
cp telegram/.env.example telegram/.env
# Fill in TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID

npm run bot         # from this directory
# or
npm run bot         # from repo root
```

Bot commands: `/balance` `/spending` `/report` `/paybox` `/ask`

## Development

```bash
npm run build    # Compile TypeScript
npm run dev      # Run CLI via tsx (no compile)
npm test         # Run tests
```
