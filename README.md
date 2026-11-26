# Our Move – Minato-ku → Shibuya-ku

A moving planner for two people moving in Tokyo. It runs in the browser, with no install and no account.

- **Steps**: about 55 Japan-specific moving steps (転出届, 転入届, gas opening appointment, 粗大ごみ, 退去立会い, neighbor greetings…). Each step explains why it matters, how to do it, where to go and what to bring. You can include or skip any step, or add your own.
- **Checklist and progress**: tick steps off. Progress is shown per phase and overall.
- **Dates**: suggested due dates come from the key dates (keys 12/12, moving day, old lease end). Changing the moving day moves all of them. Ward-office steps skip weekends, holidays and the 12/29–1/3 closure.
- **Linked notes**: shopping lists, measurements, quotes, packing… linked to steps, with groups, quantities and prices.
- **Calendar**: shows key dates, the overlap period, office closures and 六曜 (lucky days).
- **Budget**: estimates vs. actual costs, plus a 50/50 "settle up" for shared costs.
- **Info**: addresses (with copy buttons), contacts and confirmation numbers.
- **Sync**: export a backup file, send it to your partner, then "Import & merge" (for each item, the newest change wins).

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Data is stored in the browser's `localStorage` on each device.

## Files

- `index.html`: the page layout
- `styles.css`: the styles
- `data.js`: the step library, note templates and holidays (edit steps here)
- `rokuyo.js`: 六曜 for Nov 2026 – Feb 2027
- `app.js`: the app logic
