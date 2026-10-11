# API Reference

All endpoints are same-origin JSON. Mutations return errors as
`{ error, code, details }` with an appropriate HTTP status. Session auth is via
the `tms_session` httpOnly cookie; role checks are enforced server-side.

## Authentication

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | public | `{ email, password, kind: "user" \| "driver" }` → sets cookie |
| DELETE | `/api/auth/login` | session | Logout (clears cookie) |
| GET | `/api/auth/me` | session | Current session + profile |

## Users (admin)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/users` | List (filters: `q`, `role`, `status`, `department`, `page`, `pageSize`) |
| POST | `/api/users` | Create |
| GET | `/api/users/:id` | Profile + request stats |
| PATCH | `/api/users/:id` | Update |
| POST | `/api/users/:id/reset-password` | `{ password }` |

## Drivers (admin + driver self-service)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/drivers` | List (filters: `q`, `status`, `operationalStatus`) |
| POST | `/api/drivers` | Create |
| GET | `/api/drivers/:id` | Detail (incl. derived trip state) |
| PATCH | `/api/drivers/:id` | Update |
| POST | `/api/drivers/:id/status` | Override operational status `{ status, reason }` |
| POST | `/api/drivers/:id/reset-password` | `{ password }` |
| GET | `/api/driver/me` | Driver profile + assignments |
| POST | `/api/driver/availability` | `{ available }` (self-confirm) |
| GET | `/api/driver/trips` | Driver's assignments |

## Vehicles & vehicle types (admin)

| Method | Path | Description |
| --- | --- | --- |
| GET/POST | `/api/vehicles` | List / create |
| GET/PATCH | `/api/vehicles/:id` | Detail / update |
| GET/POST | `/api/vehicle-types` | List / create |
| PATCH | `/api/vehicle-types/:id` | Update |

## Requests

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/requests` | user | Create request (with passengers) |
| GET | `/api/requests` | user/admin | List (admin: all; user: own) |
| GET | `/api/requests/:id` | owner/admin/assigned driver | Detail |
| PATCH | `/api/requests/:id` | owner | Edit (material changes → re-approval) |
| POST | `/api/requests/:id/approve` | admin | `{ comment? }` |
| POST | `/api/requests/:id/reject` | admin | `{ reason }` (required) |
| POST | `/api/requests/:id/reopen` | admin | `{ reason }` (required) |
| POST | `/api/requests/:id/assign` | admin | `{ vehicleId, driverId, alternativeReason?, alternativeExplanation? }` |
| POST | `/api/requests/:id/approve-and-assign` | admin | same as assign (atomic approve + assign) |
| POST | `/api/requests/:id/reschedule` | admin | `{ startDateTime, endDateTime }` |
| POST | `/api/requests/:id/cancel` | owner/admin | `{ reason, notes? }` |
| GET | `/api/requests/:id/availability` | admin | Vehicle/driver availability |
| POST | `/api/requests/:id/start-trip` | assigned driver | Start trip |
| POST | `/api/requests/:id/complete-trip` | assigned driver | Complete trip |
| POST | `/api/requests/:id/abort` | admin | `{ reason }` (emergency abort) |

## Notifications

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/notifications` | List + unread count (for current user/driver) |
| POST | `/api/notifications/read-all` | Mark all read |
| POST | `/api/notifications/:id/read` | Mark one read |

## Audit (admin)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/audit` | List (filters: `q`, `action`, `entityType`, `page`) |

## Reports (admin)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/reports/dashboard` | Dashboard rollup + alerts |
| GET | `/api/reports/requests?groupBy=status` | Requests report |
| GET | `/api/reports/vehicle-utilization` | Vehicle utilization |
| GET | `/api/reports/driver-trips` | Driver trip counts |
| GET | `/api/reports/user-trips` | User trip counts |
| GET | `/api/reports/department` | Department-wise |
| GET | `/api/reports/vehicle-type` | Vehicle type usage |
| GET | `/api/reports/cancellation` | Cancellation report |
| GET | `/api/reports/rejection` | Rejection report |
| GET | `/api/reports/alternative` | Alternative assignment report |
| GET | `/api/reports/driver-availability` | Driver availability |

All `date-range` reports accept `from` / `to` query params (default: last 30 days).

## Imports (admin)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/imports/templates/:type` | Download template (`users` \| `drivers` \| `vehicles` \| `combined`) |
| POST | `/api/imports/stage` | `multipart` upload → validate & stage (returns `importId` + summary) |
| POST | `/api/imports/:id/confirm` | `{ duplicateMode: "SKIP" \| "UPDATE" \| "REJECT" }` |
| GET | `/api/imports` | Import history |
| GET | `/api/imports/:id` | Import job detail (per-row results) |
