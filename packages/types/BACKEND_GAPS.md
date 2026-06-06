# Backend gaps (web/types ahead of API)

Tracked fields the web UI collects or types expose; API does not yet fully support them.

## Booking (`POST /bookings`)

| Field | Status | Notes |
|-------|--------|-------|
| `sankalpa.rashi` | ✅ API DTO | `BookingSankalpaDto` accepts rashi |
| `priestPreference` | ✅ Done | Top-level DTO field; persisted on sankalpa JSON |

## Donation (`POST /donations`)

| Field | Status | Notes |
|-------|--------|-------|
| `isAnonymous` | ✅ API DTO | Persisted on donation entity |
| `isInKind` | 🟡 Partial | DTO + entity exist; `amount` still `@IsPositive()` — in-kind with `amount: 0` fails validation |
| `inKindDescription` | ✅ API DTO | Persisted on donation entity |

## Donations list for devotee home

- `GET /donations?devoteeId=` — ✅ Done; `DEVOTEE` role allowed; filters by devotee ID.
- Devotee home uses `GET /donations?devoteeId=` with fallback to `ytdDonations` on `GET /devotees/:id`.

## Notifications (new)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /notifications/send` | ✅ Stub | Email/SMS logs to console; returns `queued` |
| `GET /notifications/templates` | ✅ Done | Static template catalog |
| `GET /devotees/reminders-due` | ✅ Done | Queues notifications via notifications service |

## Analytics (new)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /analytics/dashboard` | ✅ Done | Devotees, bookings today, donations MTD, queue stats |
