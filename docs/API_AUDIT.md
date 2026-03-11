# RiseUp API audit — balance endpoints

## Full JSON responses

### GET /api/daniel/balance
```json
{"ok":true,"accounts":[{"_id":"69b15a3f69d645180058d310","accountNumberPiiId":"se_e1K6Lg","customerId":395004,"balance":15794.79,"lastUpdated":"2026-03-11T12:04:06.736Z","source":"leumiBank","credentialsName":"אישי - דניאל","created":"2026-03-11T12:04:15.350Z","__v":0,"accountNumberPiiValue":"747-2743036"}],"total":15794.79}
```

### GET /api/shelly/balance
(Same shape as daniel; returns Shelly's accounts from household balance.)
```json
{"ok":true,"accounts":[{"_id":"69b17ac408ca4817e4c85726","accountNumberPiiId":"yH8-648FoiP","customerId":320839,"balance":10854.7,"lastUpdated":"2026-03-11T14:22:38.378Z","source":"mizrahi","credentialsName":"שלי גיל","created":"2026-03-11T14:23:00.913Z","__v":0,"accountNumberPiiValue":"422-594894"}],"total":10854.7}
```

### GET /api/household/balance
```json
{"ok":true,"daniel":[{"_id":"69b15a3f69d645180058d310","accountNumberPiiId":"se_e1K6Lg","customerId":395004,"balance":15794.79,"lastUpdated":"2026-03-11T12:04:06.736Z","source":"leumiBank","credentialsName":"אישי - דניאל","created":"2026-03-11T12:04:15.350Z","__v":0,"accountNumberPiiValue":"747-2743036"}],"shelly":[{"_id":"69b17ac408ca4817e4c85726","accountNumberPiiId":"yH8-648FoiP","customerId":320839,"balance":10854.7,"lastUpdated":"2026-03-11T14:22:38.378Z","source":"mizrahi","credentialsName":"שלי גיל","created":"2026-03-11T14:23:00.913Z","__v":0,"accountNumberPiiValue":"422-594894"}],"combined_total":26649.49}
```

## Account list

| Name           | Type        | Source    | Balance   |
|----------------|-------------|-----------|-----------|
| אישי - דניאל   | Bank account| leumiBank | ₪15,794.79|
| שלי גיל       | Bank account| mizrahi   | ₪10,854.70|

No investment, credit card, or loan accounts appeared in the balance responses. Investment/savings data (if any) comes from RiseUp's financial-summary endpoint (securities, savingsAccounts, loans, mortgages), exposed via GET /api/investments.
