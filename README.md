# PR-TMS — Temple Management System

Multi-tenant SaaS platform for temple operations. See `requirements/REQUIREMENTS.md` for the full PRD.

## Structure

```
apps/
  api/          NestJS REST API (modules per domain)
  web/          Next.js 14 admin + devotee portal
packages/
  types/        Shared TypeScript types & enums
  ui/           Design system (glassmorphism, bento grid — from mockui-sn46)
docs/
  CODING_STANDARDS.md
mockui-sn46/    Interactive HTML prototype (reference)
requirements/   Product requirements document
```

## Modules (API)

| Module | Route prefix | Screens |
|--------|-------------|---------|
| Devotee | `/devotees` | Admin → Devotees |
| Booking | `/bookings`, `/services` | Devotee → Book Seva |
| Event | `/events` | Admin → Event Management |
| Rental | `/rental-assets`, `/rental-orders` | Admin → Rentals |
| Sponsor | `/sponsors` | Admin → Sponsor CRM |
| Prasadam | `/prasadam` | Admin → Prasadam Sponsorship |
| Donation | `/donations`, `/campaigns` | Devotee → Donate |
| Finance | `/finance` | Accountant dashboard |
| Front Desk | `/frontdesk` | Reception console |

## Quick Start

```bash
npm install

# API — in-memory mode (no Docker)
npm run dev:api

# Web
PORT=3001 npm run dev -w @tms/web
```

### Per-tenant environments with isolated databases (recommended)

```bash
docker compose up -d                    # PostgreSQL control plane + seed tenant
cd apps/api && cp .env.example .env
# Set STORAGE_MODE=postgres in .env
npm run dev:api                         # Auto-provisions tms_sv_temple_{dev,test,uat,prod}
```

Each customer tenant gets **dev / test / uat / prod** environments, each with its **own PostgreSQL database**. See `docs/ARCHITECTURE.md`.

API headers:
- `X-Tenant-Id`: `00000000-0000-0000-0000-000000000001` (Sri Venkateswara Temple)
- `X-Tenant-Environment`: `prod` | `uat` | `test` | `dev`

## Coding Standards

All contributors and AI agents must follow `docs/CODING_STANDARDS.md`:
- Shared types in `@tms/types` — no duplication
- Tenant-scoped services extending `BaseTenantService`
- Reusable UI in `@tms/ui` — pages compose components only
- Strict TypeScript, class-validator DTOs, Swagger on all endpoints
