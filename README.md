# Hisaab 🧾

> Personal finance tracker for Indian bank statements — AI-assisted categorization with a daily review UI.

Built from scratch in JavaScript (Node.js + React + PostgreSQL). No subscriptions, no third-party tracking. All data stays in your own database.

---

## What it does

- Upload bank statements (PDF / CSV) from HDFC, SBI, Axis, Paytm
- Auto-categorizes transactions using a **3-pass engine** — history lookup → keyword rules → Gemini AI (AI only fires for ~5–10% of transactions)
- Daily review UI: confirm or correct AI suggestions on mobile browser
- Detects and strips bank-to-bank transfers so they don't double-count
- Dashboard with spend breakdown, budget tracking, and 6-month history

---

## Stack

```
Frontend   React + Vite
Backend    Node.js + Express
Database   PostgreSQL
AI         Gemini Flash API (free tier — 1M tokens/day)
```

One language across the entire stack. No context switching.

---

## Project status

| Phase | What | Status |
|-------|------|--------|
| 1 | Docker setup, DB schema, HDFC XLS parser, `/upload` endpoint | ✅ Done |
| 2 | 3-pass categorization engine (history → keywords → Gemini) | 🔜 Next |
| 3 | Review UI (React, mobile-first) | ⬜ Planned |
| 4 | Dashboard (Recharts, budgets, filters) | ⬜ Planned |
| 5 | SBI / Axis / Paytm parsers, Vercel + Render deploy | ⬜ Planned |

---

## Getting started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- That's it

### Run locally

```bash
git clone https://github.com/Karthick-1501/Hisaab.git
cd Hisaab
cp .env.example .env
docker-compose up --build
```

Backend starts at `http://localhost:3001`.  
Check it's alive:

```bash
curl http://localhost:3001/health
# {"status":"ok","db":"connected"}
```

### Upload a statement

```bash
curl -X POST http://localhost:3001/upload \
  -F "statement=@/path/to/hdfc_statement.csv"
```

### Inspect the DB

```bash
docker exec -it money_manager_db psql -U mmuser -d money_manager
```
```sql
SELECT date, merchant_raw, amount, debit_credit FROM transactions LIMIT 10;
```

---

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | set in docker-compose |
| `GEMINI_API_KEY` | From [aistudio.google.com](https://aistudio.google.com) — free | blank (Phase 2+) |
| `PORT` | Backend port | `3001` |

---

## 3-pass categorization engine

```
PASS 1 — History lookup     (zero API calls)
  → Check merchant_map table. Hit count >= 3? Use stored category.

PASS 2 — Keyword rules      (zero API calls)
  → Match against categories.json alias map.
  → Covers ~90% of transactions after Pass 1.

PASS 3 — Gemini Flash API   (only unknowns, ~5–10%)
  → Batched via Promise.all()
  → Falls back to "Other" on API failure
```

Add your own aliases by editing `categories.json` — no code changes needed.

---

## Supported banks

| Bank | Format | Status |
|------|--------|--------|
| HDFC | XLS | ✅ Phase 1 |
| SBI | PDF | 🔜 Phase 5 |
| Axis | CSV | 🔜 Phase 5 |
| Paytm | CSV | 🔜 Phase 5 |
| Generic | CSV (column sniff) | 🔜 Phase 5 |

---

## Free tier costs

| Service | Limit | Expected usage |
|---------|-------|----------------|
| Gemini Flash | 1M tokens/day | ~20K tokens/month |
| Vercel Hobby | 100 GB bandwidth | Negligible |
| Render | 750 hrs/month | Fine for personal use |
| Supabase | 500 MB DB | Under 10 MB for years |

**Total cost: ₹0/month** (unless you somehow exceed Gemini's free tier).

---

## Author

Designed and Developed by Karthick.

- Website: [karthick.at](https://karthick.at/)
- LinkedIn: [linkedin.com/in/karthicks1520](https://www.linkedin.com/in/karthicks1520/)


---

## License

MIT — personal use, do whatever you want with it :) 
