# data/

Shared data files for manual tracking. These are checked into git so both partners can sync via the repo.

## Files

### `paybox.json`
PayBox shared expense entries (future integration).

Schema (planned):
```json
[
  {
    "date": "2026-03-01",
    "amount": 150.00,
    "description": "Groceries",
    "paidBy": "daniel",
    "splitWith": "shelly",
    "category": "Food"
  }
]
```

### `manual-expenses.json`
Manually logged expenses not captured by bank scraping (cash, Bit transfers, etc.).

Schema (planned):
```json
[
  {
    "date": "2026-03-01",
    "amount": 50.00,
    "description": "Cash - market",
    "profile": "daniel",
    "category": "Food",
    "method": "cash"
  }
]
```
