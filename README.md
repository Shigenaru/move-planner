# Our Move – Minato-ku → Shibuya-ku

A moving planner for two people moving in Tokyo. It runs in the browser, with no install and no account.

- **Steps**: about 55 Japan-specific moving steps (転出届, 転入届, gas opening appointment, 粗大ごみ, 退去立会い, neighbor greetings…). Each step explains why it matters, how to do it, where to go and what to bring. You can include or skip any step, or add your own.
- **Checklist and progress**: tick steps off. Progress is shown per phase and overall.
- **Dates**: suggested due dates come from the key dates (keys 12/12, moving day, old lease end). Changing the moving day moves all of them. Ward-office steps skip weekends, holidays and the 12/29–1/3 closure.
- **Linked notes**: shopping lists, measurements, quotes, packing… linked to steps, with groups, quantities and prices.
- **Calendar**: shows key dates, the overlap period, the overlap period and office closures.
- **Budget**: estimates vs. actual costs, plus a 50/50 "settle up" for shared costs.
- **Info**: addresses (with copy buttons), contacts and confirmation numbers.
- **Live sync**: sign in with Google and both phones show the same plan, updated live (Firebase Firestore). For each item, the newest change wins. Export/import of a backup file is still available.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Live at https://shigenaru.github.io/move-planner/ (GitHub Pages, `main` branch).

Data is kept in the browser's `localStorage` and, when signed in, in one Firestore document (`plans/shared`). Access is limited by Firestore security rules to the couple's Google accounts. The Firebase web config in `firebase-config.js` is public by design.

## Files

- `index.html`: the page layout
- `styles.css`: the styles
- `data.js`: the step library, note templates and holidays (edit steps here)
- `app.js`: the app logic
- `sync.js` / `firebase-config.js`: live sync (Google sign-in + Firestore)
