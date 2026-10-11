# Architecture

## Overview

The TMS is a single Next.js App Router application with three roles (Admin, User,
Driver). Data is accessed through a Prisma client backed by SQLite (portable to
PostgreSQL). All business rules live in **domain service modules** under
`src/modules/` and are enforced server-side; the UI and API routes are thin
clients of those services.

```
┌─────────────────────────────────────────────────────────────┐
│ Browser (Admin / User / Driver)                             │
│   React Server Components (data) + Client Components (forms)│
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP (same-origin fetch, session cookie)
┌──────────────────────▼──────────────────────────────────────┐
│ Next.js App Router                                          │
│   proxy.ts  → auth gate (JWT cookie verify + redirect)      │
│   app/api/* → Route Handlers (authz via requireRole)        │
│   app/*     → Server Components (read via services)         │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ Domain services (src/modules/*)                             │
│   approval · cancellation · assignment · availability · …    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ Prisma ORM → SQLite (dev) / PostgreSQL (prod)               │
└─────────────────────────────────────────────────────────────┘
```

## Authentication & authorization

- Passwords are hashed with `bcryptjs`.
- On login, a signed JWT (`jose`, HS256) is stored in an httpOnly cookie
  (`tms_session`) carrying `{ sub, kind, role, name }`.
- `src/proxy.ts` verifies the cookie and redirects unauthenticated users to
  `/login`; role-based landing pages are resolved from the session.
- Every API route calls `requireRole` / `requireAdmin` / `requireDriver`
  (`src/lib/rbac.ts`) — the frontend is never trusted.

## Domain model

| Entity | Purpose |
| --- | --- |
| `User` | Admin / requester accounts |
| `Driver` | Separate login account + operational status + license |
| `VehicleType` | Authoritative capacity per type (SMALL=3, MEDIUM=5, LARGE=8) |
| `Vehicle` | Registration, type, capacity, operational status |
| `TransportRequest` | Request number, requester, times, purpose, status, approval/cancellation/alternative metadata |
| `Passenger` | Per-passenger name + pickup (and optional drop) |
| `RequestApproval` | Immutable approval trail (APPROVED / REJECTED / REOPENED) |
| `VehicleBooking` | Vehicle time-range booking (ACTIVE / RELEASED / CANCELLED / COMPLETED) |
| `DriverAssignment` | Driver time-range assignment — source of truth for driver scheduling/conflicts |
| `DriverAvailabilityHistory` | Operational-status change log |
| `Notification` | In-app notifications (user or driver recipient) |
| `AuditLog` | Immutable audit trail |
| `ImportJob` / `ImportRow` | Bulk import staging, validation, results |
| `Sequence` | Atomic per-year request-number counter |

## Request lifecycle & status transitions

```text
PENDING ──► APPROVED ──► ASSIGNED ──► ON_TRIP ──► COMPLETED
   │           │            │
   └─► REJECTED│            └─► CANCELLED (before start)
   └─► CANCELLED│
   REJECTED ──► PENDING (reopen)
   CANCELLED ──► PENDING (reopen)
```

`STATUS_TRANSITIONS` in `src/lib/constants.ts` is the single source of truth;
`assertTransition` rejects everything else.

## Engines

- **Approval engine** (`modules/approvals`): approve/reject/reopen; records
  `RequestApproval` + audit + notification. Admins cannot approve their own
  requests.
- **Cancellation engine** (`modules/cancellations`): validates permission,
  current status, and trip timing; requires a reason; releases vehicle/driver
  resources without deleting history.
- **Availability engine** (`modules/availability`): vehicle/driver availability
  via time-range overlap and operational status; request-centric availability
  view for the admin detail screen.
- **Assignment engine** (`modules/assignments`): transactional assignment that
  re-checks vehicle/driver conflicts inside the transaction (race protection);
  supports **Approve & Assign** (approval recorded atomically with assignment);
  enforces capacity and alternative-assignment reasons.
- **Driver availability** (`modules/drivers`, `modules/trips`): two-concept
  model; trip completion forces `AWAITING_CONFIRMATION`.

## Conflict detection

Two ranges conflict when `A.start < B.end AND A.end > B.start`
(`src/lib/overlap.ts`). Assignments are created inside a `prisma.$transaction`
that re-runs the overlap query, so two admins cannot double-book the same
vehicle/driver.

## Import engine

`modules/imports` separates parsing (`xlsx`), validation (per-type row
validators), duplicate detection (against DB and within-file), and a two-phase
**stage → confirm** workflow with per-row results and import history.

## Notifications & audit

- `lib/notify.ts` is a thin service (`user` / `driver` / `all-admins`) designed
  so email/SMS/WhatsApp providers can be added later.
- `lib/audit.ts` writes immutable `AuditLog` rows; there is no update/delete
  API for them.
