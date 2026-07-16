# Live Sales Monitoring App

A fullscreen TV leaderboard for a sales floor with a mobile manager panel. Powered by Google Apps Script (no backend server needed).

---

## Stack

| Layer      | Tech                               |
|------------|------------------------------------|
| Frontend   | React + Vite + Tailwind CSS        |
| Backend/DB | Google Apps Script Web App         |
| Real-time  | Polling every 10 seconds           |

---

## Quick Setup

### Step 1 — Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a **new spreadsheet**.
2. Create these **5 tabs** (right-click the bottom tab → Rename/Insert):

| Tab name   | Header row (paste into row 1, one per cell)                             |
|------------|-------------------------------------------------------------------------|
| `members`  | `id` · `team_id` · `name` · `photo_url` · `quota_individual`           |
| `sales`    | `id` · `member_id` · `amount` · `notes` · `timestamp` · `month` · `year` |
| `teams`    | `id` · `name` · `color`                                                |
| `quotas`   | `month` · `year` · `team_id` · `team_quota` · `site_quota`             |
| `settings` | `key` · `value`                                                        |

3. In the `settings` tab, add these rows:

| key          | value       |
|--------------|-------------|
| manager_pin  | 1234        |
| site_name    | Sales Floor |
| currency     | PHP         |

4. In the `teams` tab, add these rows:

| id | name        | color   |
|----|-------------|---------|
| 1  | Team Alpha  | #3B82F6 |
| 2  | Team Beta   | #F97316 |
| 3  | Team Gamma  | #A855F7 |

> **Tip:** Instead of manual setup, paste `Code.gs` into Apps Script and run the `setupSheets()` function to auto-create everything including seed data.

---

### Step 2 — Set Up Apps Script

1. In your Google Sheet, go to **Extensions → Apps Script**.
2. Delete any existing code.
3. Paste the entire contents of **`Code.gs`** from this repo.
4. Click **Save** (disk icon).

**Deploy as Web App:**

5. Click **Deploy → New Deployment**.
6. Click the gear ⚙ next to "Type" and select **Web App**.
7. Fill in:
   - **Description:** `Sales Board v1`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
8. Click **Deploy**.
9. Authorize the permissions when prompted.
10. **Copy the Web App URL** — it looks like:
    ```
    https://script.google.com/macros/s/AKfycb.../exec
    ```

> **Every time you edit Code.gs:** go to Deploy → Manage Deployments → Edit → select **New Version** → Deploy. The URL stays the same.

---

### Step 3 — Configure the Frontend

1. In the project root, create a `.env` file:
   ```
   VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ```
2. Install dependencies and start the dev server:
   ```bash
   npm install
   npm run dev
   ```

---

### Step 4 — Display on TV

| URL                                  | Purpose                  |
|--------------------------------------|--------------------------|
| `http://[your-ip]:5173/board`        | Fullscreen TV board       |
| `http://[your-ip]:5173/manager`      | Manager phone/tablet app  |

Find your local IP: run `ipconfig` (Windows) or `ifconfig` (Mac/Linux).

Open the board URL in the TV browser (Chrome recommended) and press **F11** for fullscreen.

---

## Seed Data

If you used `setupSheets()`, the sheet is already seeded. To add manually:

**members tab:**
```
101 | 1 | Maria Santos    | https://i.pravatar.cc/150?u=maria  | 50000
102 | 1 | Juan dela Cruz  | https://i.pravatar.cc/150?u=juan   | 50000
103 | 1 | Ana Reyes       | https://i.pravatar.cc/150?u=ana    | 50000
104 | 1 | Mark Torres     | https://i.pravatar.cc/150?u=mark   | 50000
201 | 2 | Carlo Bautista  | https://i.pravatar.cc/150?u=carlo  | 50000
202 | 2 | Lea Gomez       | https://i.pravatar.cc/150?u=lea    | 50000
203 | 2 | Ryan Flores     | https://i.pravatar.cc/150?u=ryan   | 50000
204 | 2 | Nina Villanueva | https://i.pravatar.cc/150?u=nina   | 50000
301 | 3 | Jake Mendoza    | https://i.pravatar.cc/150?u=jake   | 50000
302 | 3 | Grace Lim       | https://i.pravatar.cc/150?u=grace  | 50000
303 | 3 | Tony Aquino     | https://i.pravatar.cc/150?u=tony   | 50000
304 | 3 | Cris Pascual    | https://i.pravatar.cc/150?u=cris   | 50000
```

**quotas tab** (for current month, e.g. June 2026):
```
6 | 2026 | 1 | 200000 | 600000
6 | 2026 | 2 | 200000 | 600000
6 | 2026 | 3 | 200000 | 600000
```

---

## Features

### Board (`/board`)
- Live clock updating every second
- Site MTD total and quota progress bar
- 3 team columns sorted by sales rank (updates every 10 seconds)
- Per-member leaderboard with quota mini-bars
- 🔥 HOT badge when individual quota is hit
- ⚡ streak badge for 3+ consecutive sale days
- MTD / Today view toggle in header
- Auto-scrolling ticker of recent sales
- Hall of Fame rotating carousel (top 3 MTD)
- Milestone toast at 50% and 75% team quota
- Celebration popup on new sale detected via polling

### Manager Panel (`/manager`)
- PIN gate (validated server-side, session-stored)
- **Log Sale:** team cards → member avatars → amount → submit → 30s undo
- **Members:** add, edit, remove members per team
- **Teams:** edit team name, color, monthly quota
- **Quotas & Settings:** site quota, site name, currency, PIN change
- **Sales Log:** paginated table with team/member filter, month selector, CSV export

### Celebration Popup
- Confetti explosion (canvas-confetti)
- Member photo with glowing ring animation
- Quota hit banners stagger in: Individual → Team → Site
- 10-second countdown auto-dismiss
- Sound effect toggle (persisted in localStorage)

---

## Project Structure

```
sales-monitoring-app/
├── Code.gs                      ← Paste into Apps Script editor
├── .env.example                 ← Copy to .env and fill in URL
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── src/
    ├── api/
    │   └── sheets.js            ← All API calls to Apps Script
    ├── hooks/
    │   └── useBoard.js          ← Polling hook (10s interval)
    ├── components/
    │   ├── Avatar.jsx
    │   ├── CelebrationPopup.jsx
    │   ├── HallOfFame.jsx
    │   ├── PinGate.jsx
    │   ├── QuotaBar.jsx
    │   ├── TeamColumn.jsx
    │   └── Ticker.jsx
    ├── pages/
    │   ├── BoardPage.jsx
    │   └── ManagerPage.jsx
    ├── App.jsx
    ├── main.jsx
    └── index.css
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Board shows "CONNECTION ERROR" | Check `VITE_APPS_SCRIPT_URL` in `.env`. Restart dev server after editing. |
| CORS errors in console | Re-deploy the Apps Script as a new version. Make sure "Who has access" is **Anyone**. |
| PIN rejected | Run `setupSheets()` once to ensure the settings tab has `manager_pin = 1234`. |
| Board stuck on old data | Apps Script caches can take 1–2 minutes. Try a hard refresh. |
| Photos not loading | Use `https://i.pravatar.cc/150?u=uniquename` for free placeholder avatars. |

---

## Production Build

```bash
npm run build
# Output in /dist — serve with any static host (Nginx, Vercel, Netlify, etc.)
```
