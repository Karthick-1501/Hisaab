# Hisaab 🧾

> Personal finance tracker for Indian bank statements — AI-assisted categorization with a daily review UI.

Built from scratch in JavaScript (Node.js + React + PostgreSQL). No subscriptions, no third-party tracking. All data stays in your own database.

---

## What it does

- Upload bank statements (XLS / CSV) from HDFC — more banks coming
- Auto-categorizes transactions using a **3-pass engine** — history lookup → keyword rules → Gemini AI (AI only fires for unknowns)
- Detects and strips bank-to-bank transfers so they don't double-count
- Review queue: confirm or correct AI suggestions before they hit the dashboard
- Dashboard with spend breakdown, budget tracking, and 6-month history *(Phase 4)*

---

## Stack

```
Frontend   React + Vite          (Phase 3)
Backend    Node.js + Express     ✅ Live
Database   PostgreSQL            ✅ Live
AI         Gemini 2.0 Flash API  ✅ Live (free tier — 15 req/min)
```

One language across the entire stack. No context switching.

---

## Project status

| Phase | What | Status |
|-------|------|--------|
| 1 | Docker setup, DB schema, HDFC XLS parser, `/upload` endpoint | ✅ Done |
| 2 | 3-pass categorization engine, transfer detection, `/review` endpoints | ✅ Done |
| 3 | Review UI (React, mobile-first) | 🔜 Next |
| 4 | Dashboard (Recharts, budgets, filters) | ⬜ Planned |
| 5 | SBI / Axis / Paytm parsers, Vercel + Render deploy | ⬜ Planned |

---

## Getting started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- A free Gemini API key from [aistudio.google.com](https://aistudio.google.com)

### Run locally

```bash
git clone https://github.com/Karthick-1501/Hisaab.git
cd Hisaab
cp .env.example .env
# Add your GEMINI_API_KEY to .env
docker-compose up --build
```

Backend starts at `http://localhost:3001`.  
Check it's alive:

```bash
curl http://localhost:3001/health
# {"status":"ok","db":"connected"}
```

### Run the DB migration (one-time)

```bash
docker exec -i money_manager_db psql -U mmuser -d money_manager < migration-phase2.sql
```

### Upload a statement

```bash
curl -X POST http://localhost:3001/upload \
  -F "statement=@/path/to/hdfc_statement.xls"
```

Response includes parsed count, inserted count, transfers detected, and categorization breakdown across all 3 passes.

### Check pending review queue

```bash
curl http://localhost:3001/review/pending
```

### Confirm a category

```bash
curl -X PATCH http://localhost:3001/review/42 \
  -H "Content-Type: application/json" \
  -d '{"category": "Food & Dining"}'
```

---

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | set in docker-compose |
| `GEMINI_API_KEY` | From [aistudio.google.com](https://aistudio.google.com) — free | required for Pass 3 |
| `PORT` | Backend port | `3001` |

---

## API endpoints

| Method | Endpoint | What it does |
|--------|----------|--------------|
| GET | `/health` | Health check — DB connectivity |
| POST | `/upload` | Accept XLS/CSV, parse, detect transfers, run 3-pass categorization |
| GET | `/review/pending` | All unreviewed transactions, newest first |
| GET | `/review/categories` | Valid category list |
| PATCH | `/review/:id` | Confirm a category, upsert merchant dictionary |

---

## 3-pass categorization engine

```
PASS 1 — History lookup     (zero API calls)
  → Check merchant_map table. Hit count >= 3? Auto-confirm, skip review.

PASS 2 — Keyword rules      (zero API calls, instant)
  → Match against categories.json alias map.
  → Catches Swiggy, Amazon, Ixigo, medical, etc. in milliseconds.

PASS 3 — Gemini 2.0 Flash   (only unknowns — person names, local shops)
  → Batched with rate limit handling
  → Falls back to "Other" on API failure — never crashes the upload
```

Corrections feed back into the merchant dictionary. After 3 confirmations, a merchant is auto-confirmed on future uploads — no API call needed.

Add your own aliases by editing `categories.json` — no code changes needed.

---

## Transfer detection

Same-day, same-amount DEBIT + CREDIT across different banks = internal transfer.  
Both sides are flagged as `is_transfer = true` and excluded from expense tracking.  
Stored in `bank_transfers` table for reference.

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
| Gemini 2.0 Flash | 15 req/min, 1500 req/day | ~91 calls/upload (Pass 3 only) |
| Vercel Hobby | 100 GB bandwidth | Negligible |
| Render | 750 hrs/month | Fine for personal use |
| Supabase | 500 MB DB | Under 10 MB for years |

**Total cost: ₹0/month.**

---

## Reference

Categorization logic and transfer detection approach inspired by  
[nagendra333333/AI-Driven-Expense-Tracker-Public](https://github.com/nagendra333333/AI-Driven-Expense-Tracker-Public) (Python + CLI).  
Hisaab is an independent JavaScript rewrite — redesigned as a full-stack web app with a daily review UI, PostgreSQL persistence, and mobile-first frontend.

---

## Author

Designed and developed by Karthick.

- Website: [karthick-1501.github.io](https://karthick-1501.github.io/)
- LinkedIn: [linkedin.com/in/karthicks1520](https://www.linkedin.com/in/karthicks1520/)

---

## License

MIT — personal use, do whatever you want with it :)
