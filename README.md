# Transport Management System (TMS)

A production-ready, role-based company transport management system built with
**Next.js 16 (App Router) + TypeScript + Tailwind CSS + Prisma + Zod**.

It manages users, vehicles, drivers, transport requests, approvals, cancellations,
vehicle/driver assignment, driver availability, bulk onboarding, notifications,
reports, and an immutable audit trail.

## Roles

| Role   | Capabilities                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------ |
| Admin  | Full operational control: manage users/drivers/vehicles, review & approve/reject/reopen requests, assign & reschedule, cancel, bulk import, reports, audit. |
| User   | Create requests with multiple passengers & individual pickups, track status, cancel eligible requests. |
| Driver | Mobile-first dashboard: current/upcoming trips, start/complete trips, confirm availability.       |

## Key business rules (enforced server-side)

- Requests always start **PENDING** and require **admin approval** before assignment.
- Rejection requires a reason; rejected/cancelled requests can only be **reopened** by an admin (back to PENDING).
- Material edits after approval reset the request to PENDING (re-approval).
- **Capacity**: `passengerCount ≤ vehicle.capacity`; a smaller vehicle than requested is never auto-assigned.
- **Alternative assignment** (larger vehicle) requires a mandatory reason.
- **Conflict detection** via time-range overlap (`A.start < B.end AND A.end > B.start`), with transactional re-checks to prevent double-booking.
- **Driver availability** is two concepts: *operational status* (AVAILABLE / UNAVAILABLE / AWAITING_CONFIRMATION) and *trip state* (IDLE / BOOKED / ON_TRIP, derived from assignments).
- After a trip completes, a driver is set to **AWAITING_CONFIRMATION** — never auto-AVAILABLE.
- Cancellation is a controlled workflow with role, status, and timing rules; cancelled assignments release vehicle/driver resources without deleting history.
- Passenger phone numbers are never collected nor exposed to drivers.

## Tech stack

- **Frontend/API:** Next.js 16 (App Router, Route Handlers, `proxy` auth gate)
- **Language:** TypeScript
- **Database:** PostgreSQL 17 (Docker) via Prisma ORM
- **Auth:** `jose` JWT in an httpOnly cookie + `bcryptjs` password hashing
- **Validation:** Zod
- **File import:** `xlsx` (SheetJS) for `.xlsx` / `.csv`
- **Tests:** Node's built-in test runner via `tsx`

## Requirements

- Node.js ≥ 20.9
- npm
- Docker (for PostgreSQL — see `docker-compose.yml`)

## Getting started

```bash
npm install

# 1. Start PostgreSQL (Docker)
docker compose up -d             # postgres:17 on localhost:5432

# 2. Configure environment
cp .env.example .env             # DATABASE_URL + AUTH_SECRET (defaults point at Docker Postgres)

# 3. Apply migrations + seed
npx prisma migrate deploy
npm run db:seed

# 4. Run
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

### Seed credentials

| Account | Email | Password |
| --- | --- | --- |
| Admin | `admin@tms.local` | `admin1234` |
| User | `rahim@company.com` (also karim/hasan/jesmin) | `password123` |
| Driver | `driver1@company.com` (also driver2..4) | `password123` |

## Environment variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Prisma connection string (defaults to `postgresql://postgres:postgres@localhost:5432/tms`) |
| `AUTH_SECRET` | Secret used to sign session JWTs (required) |
| `SESSION_MAX_AGE_SECONDS` | Session cookie lifetime (default `2592000`) |

## Scripts

```bash
npm run dev          # dev server (Turbopack)
npm run build        # production build
npm run start        # serve production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run db:migrate   # prisma migrate dev
npm run db:seed      # reseed the database
npm run test         # unit + integration tests
npm run db:studio    # Prisma Studio
```

## Testing

```bash
npm run test
```

- `tests/unit.test.ts` — pure business rules: time-range overlap, status
  transitions, trip-state derivation.
- `tests/integration.test.ts` — end-to-end service flows against a throwaway
  PostgreSQL DB (`tms_test`): approval, rejection, re-approval, assignment,
  conflict detection, capacity, alternative assignment, cancellation rules, and
  post-trip `AWAITING_CONFIRMATION`.

## Project structure

```
tms/
├── prisma/              # schema.prisma, migrations, seed.ts
├── src/
│   ├── lib/             # prisma client, auth, rbac, errors, audit, notify, …
│   ├── modules/         # domain services (requests, approvals, cancellations,
│   │                    #   assignments, availability, drivers, vehicles, users,
│   │                    #   imports, reports, audit, notifications, trips)
│   ├── components/      # React UI (app shell, forms, status badges, actions)
│   └── app/             # App Router pages + API route handlers
├── tests/
├── docs/                # architecture + API reference
└── README.md
```

## Docker

PostgreSQL runs in Docker (see `docker-compose.yml`):

```bash
docker compose up -d       # start PostgreSQL (postgres:17-alpine, port 5432)
docker compose down        # stop (data persists in the `tms_pgdata` volume)
```

The Prisma schema uses the `postgresql` provider; the SQLite provider is a
one-line change away if you ever need an embedded database.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — modules, engines, request lifecycle.
- [API reference](docs/API.md) — endpoint catalogue.
