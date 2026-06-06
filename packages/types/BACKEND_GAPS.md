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

- `GET /donations?devoteeId=` — **not implemented**; `GET /donations` is admin/accountant/front-desk only and has no devotee filter.
- Devotee home falls back to `ytdDonations` on `GET /devotees/:id` when recent rows are unavailable.
