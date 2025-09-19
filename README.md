
# Altidal Frontend (MVP)

Search empty‑leg private flights, view results, send inquiries, and create email alerts.

## Quick start
```bash
# 1) install
pnpm i   # or: npm i  OR yarn

# 2) dev
pnpm dev # http://localhost:3000

# 3) build
pnpm build && pnpm start
```

## What’s included
- Next.js App Router + TypeScript + Tailwind
- UI: Hero search, results, detail modal, inquiry + alerts
- Mock API routes under `/api/*` returning sample data
- Simple design tokens; easy to swap for shadcn/ui later

## Where to plug your backend
- `/src/app/api/legs/search/route.ts` – hook to your search service
- `/src/app/api/leads/route.ts` – forward inquiries to operator/broker
- `/src/app/api/alerts/route.ts` – persist user alerts + email setup

## Notes
- This is an MVP scaffold. Replace mock data with real services when ready.
