# ATP Sales Monitoring App — Performance Report

**Prepared:** July 1, 2026  
**Version:** 1.0.0  
**Platform:** React 18 + Vite 5 + Google Apps Script (GAS) Backend

---

## Executive Summary

The ATP Live Sales Monitoring App is a real-time, browser-based sales dashboard designed for display on a shared office screen. It replaces manual tracking methods with an automated, always-on system that pulls live data from Google Sheets every 10 seconds, triggers celebration animations on key milestones, and publicly recognizes top performers — driving accountability and healthy competition across the sales floor.

---

## Architecture Overview

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 + Vite 5 | Fast, component-based UI |
| Styling | Tailwind CSS 3 | Utility-first responsive design |
| Routing | React Router 6 | Board view / Manager view separation |
| Audio | Howler.js + Web Audio API | Celebration sound effects |
| Effects | Canvas Confetti + custom engines | Fireworks, coin rain, visual effects |
| Backend | Google Apps Script | REST-like API over Google Sheets |
| Data Store | Google Sheets | Sales logs, quotas, member records |
| Hosting | Any static file host (Vite build) | Zero server infrastructure cost |

---

## Feature Inventory

### Live Board (`/board`)

- **Real-time polling** — fetches full board data every **10 seconds**, surfacing new sales within one polling cycle
- **MTD / Today toggle** — switch between month-to-date totals and today's-only view without a page refresh
- **Site-wide quota bar** — single progress bar showing the entire site's MTD vs. target at a glance
- **Auto-cycling views** — 11 views rotate automatically with configurable durations (9–18 seconds each):
  - Live Board (all teams, 18s)
  - Individual team spotlights × 5 (9–12s each)
  - Top Agents individual standings (12s)
  - Wall of Fame podium (12s)
  - Today's Sales activity feed (10s)
  - Quarterly Awards tracker (15s)
  - Yearly Awards tracker (15s)
- **Manual jump** — click any view in the cycle nav bar to jump to it instantly
- **Milestone toasts** — push notification when any team crosses 50% or 75% of quota
- **Scrolling sales ticker** — bottom bar shows a live feed of recent sales names and amounts
- **Hall of Fame strip** — compact bottom-right panel showing MTD top performers

### Celebration System

Five escalating tiers of celebration, triggered automatically on each new sale:

| Tier | Trigger | Effects |
|---|---|---|
| T1 — Regular Sale | Any new sale logged | Agent card with amount + team color |
| T2 — Individual Quota | Agent crosses personal quota | Animated banner + coin rain |
| T3 — Sub-Team Quota | Sub-team crosses group quota | Team member avatars + quota bar |
| T4 — Main Team Quota | Parent team crosses quota | Screen shake + fireworks |
| T5 — Site Quota | Entire site crosses quota | Full-screen multi-phase sequence with fireworks |
| Incentive Circle | Agent advances a circle tier | Dedicated incentive popup with tier details |

- **Franki sale support** — two-agent shared sales show both agents in the celebration popup simultaneously
- **Sound effects** — layered Web Audio API synth sounds per tier; Howler.js file-based audio when MP3s are present

### Wall of Fame (Podium View)

- **Podium layout** — Diamond (center/highest), Gold (left/mid), Silver (right/lowest) with accurate step-height offsets
- **Member cards** — large avatar photo, name, team, rank badge, and MTD amount per card
- **High Flyers sidebar** — agents who reached 100% of personal quota, with quota progress bar and percentage
- **Previous month data** — automatically shows the prior month's champions

### Individual Standings

- Full ranked list of all non-executive agents
- MTD total, daily total, quota progress bar, and streak indicators

### Team Spotlight (per-team views)

- Podium for top 3 members in the team
- Full member list with quota bars
- Sub-team breakdown for parent teams
- Rank against other teams

### Awards Tracker

- **Quarterly circles** — Bronze, Silver, Gold, Platinum, Chairman's, President's, Executive
- **Yearly circles** — same tiers tracked on an annual basis
- Cash incentive values and new client bonuses per tier
- Clickable member cards to open detailed incentive breakdown modal

### Manager Panel (`/manager`, PIN-protected)

- Log a new sale (member, amount, date, notes, Franki flag)
- Add / edit / delete team members
- Edit team names and colors
- Set per-member monthly quotas
- Set per-tier default quota templates
- Update site settings (site name, currency, USD exchange rate)
- Export monthly sales to CSV
- View and delete individual sale records
- Log and delete new client entries

---

## Technical Performance

### Data Freshness

| Signal | Latency |
|---|---|
| New sale appears on board | ≤ 10 seconds (next poll) |
| Incentive level changes | ≤ 30 seconds (separate incentive poll) |
| Celebration popup triggers | Immediate on poll detection |
| Clock display | Real-time (1-second interval) |
| Bottom-left stats rotation | Every 4 seconds |

### Frontend Performance

- **Bundle size** — Vite production build with tree-shaking; only Howler.js and canvas-confetti are notable runtime dependencies
- **No unnecessary re-renders** — `useMemo` used for derived team rankings and bottom-left stat items; `useCallback` on the fetch function
- **Timer hygiene** — all `setInterval` and `setTimeout` calls return cleanup functions via `useEffect`; celebration T5 phase timers stored in a `useRef` and cleared on unmount
- **Audio context safety** — `AudioContext.resume()` promise stored and awaited before sound playback to handle Chrome's autoplay policy correctly
- **View key rotation** — `viewKey` state forces a fresh mount (`key={viewKey}`) on each cycle change, triggering the `animate-view-enter` CSS animation cleanly
- **No build-time errors** — confirmed via `vite build --mode development`; 0 parse errors, 0 broken imports

### Backend (Google Apps Script)

- Single `doGet` / `doPost` handler routes all API actions
- Spreadsheet reads use `.getValues()` in bulk — minimizes Sheets API quota consumption
- PIN verification uses server-side comparison — PIN never exposed in client bundle
- `setupSpreadsheet()` seed function idempotently creates all required sheets

### Known Constraints

| Constraint | Impact | Mitigation |
|---|---|---|
| GAS execution time limit (6 min) | Large exports may timeout | Export is batched by month |
| Sheets API rate limit (300 req/min) | Parallel heavy usage unlikely at a single site | 10s polling keeps request rate low |
| No WebSocket / push | Celebrations appear on the next 10s poll, not the instant a sale is saved | Acceptable for a display board |
| MP3 sound files not bundled | Falls back to Web Audio API procedural synth | Functional; add MP3s to `/public/sounds/` for richer audio |

---

## Benefits of Having This App

### 1. Real-Time Visibility
Sales results are visible to every agent on the floor within seconds of being logged. There is no waiting for end-of-day reports or manual tallying. Leaders and agents alike see the same live numbers at all times.

### 2. Immediate Motivation and Recognition
Celebration popups, sound effects, and fireworks fire the moment a milestone is hit — a personal quota, a team quota, or the site-wide target. Public recognition in real time creates a sense of achievement that delayed reporting cannot replicate.

### 3. Healthy Competition
The ranked team columns, individual standings, and podium view make performance comparisons visible and fair. Agents can see exactly where they stand relative to teammates and other teams, driving discretionary effort without requiring management intervention.

### 4. Transparent Quota Tracking
Every agent's personal quota bar is always on screen. Team quota bars show collective progress. The site-wide bar shows the entire floor's position. No one can be unaware of what is expected or where they currently stand.

### 5. Zero Infrastructure Cost
The backend runs entirely on Google Apps Script — a free, serverless platform tied to the company's existing Google Workspace account. There are no servers to provision, no databases to manage, and no hosting fees beyond a static file deployment for the frontend.

### 6. Manager Self-Service
The PIN-protected Manager Panel lets team leads log sales, adjust quotas, manage agents, and export reports without requiring developer involvement. All changes propagate to the live board within the next polling cycle.

### 7. Incentive Program Clarity
The Awards Tracker makes quarterly and yearly incentive circles visible to all agents at all times. Agents know exactly which circle they are in, what the next tier requires, and what cash value is attached — removing ambiguity from the incentive program and reducing questions to management.

### 8. Wall of Fame — Lasting Recognition
The previous month's top performers are permanently displayed in the podium view. Diamond, Gold, and Silver Club members are shown with their photo and total, creating a lasting public record of achievement that motivates agents beyond the current month.

### 9. Low Maintenance
Because the data source is Google Sheets — which the team already uses — there is no data migration, no new software to learn for data entry, and no integration work. The app reads and writes the same spreadsheet the team already owns.

### 10. Scalable Team Structure
The app supports parent teams with sub-teams, Franki (paired) sales, executive members excluded from rankings, per-tier quotas, and per-member overrides. It can grow with the organization without requiring architectural changes.

---

## Recommendations

1. **Add MP3 sound files** to `/public/sounds/` for all 14 defined sound keys to replace the procedural synth fallback with high-quality audio.
2. **Update the live "teams" sheet** — rename the "Leadership" row to "Executives" to match the `Code.gs` seed data update.
3. **Consider a deployment pipeline** — a GitHub Actions workflow that builds with `npm run build` and deploys `dist/` to a static host (e.g., Netlify, Cloudflare Pages) would make updates one-click.
4. **Add agent photo upload** — the `photo_url` field is already supported in the data model; a Google Drive link workflow for uploading agent headshots would complete the visual identity in the Wall of Fame cards.
5. **Monitor GAS quota usage** if team size grows significantly — consider caching the `getBoard` response in GAS `CacheService` to reduce Sheets reads under heavy polling.

---

*Generated by Claude Code — ATP Tools, July 2026*
