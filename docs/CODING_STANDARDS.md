# TMS Coding Standards

All modules must follow these conventions. Reference: `requirements/REQUIREMENTS.md`, `mockui-sn46/`.

## Architecture

```
apps/api/src/
  common/          # Shared middleware, guards, decorators, base classes
  modules/         # Feature modules (one folder per domain)
    <module>/
      dto/         # Request/response DTOs with class-validator
      entities/    # TypeORM entities (or Prisma models)
      <module>.controller.ts
      <module>.service.ts
      <module>.module.ts
      <module>.repository.ts  # Optional: data access layer
```

## TypeScript

- `strict: true` everywhere
- No `any` — use `unknown` + type guards
- Shared types live in `packages/types` — never duplicate DTOs across modules
- Use `interface` for data shapes, `type` for unions/intersections
- Enums in `packages/types/src/enums/`

## NestJS Modules

- One module per domain (devotee, booking, event, rental, sponsor, prasadam, donation, finance, frontdesk)
- Services contain business logic only — no HTTP concerns
- Controllers are thin — validate DTO, call service, return response
- All queries scoped by `tenantId` from `@TenantId()` decorator
- Use `BaseTenantService` for tenant-scoped CRUD patterns

## API Conventions

- REST under `/api/v1/<resource>`
- Pagination: `?page=1&limit=20` → `{ data, meta: { total, page, limit } }`
- Errors: `{ statusCode, message, error, details? }`
- OpenAPI decorators on all endpoints (`@ApiTags`, `@ApiOperation`, `@ApiResponse`)
- Idempotent writes where required (payments, webhooks)

## Multi-Tenancy

- Every entity has `tenantId: string` (UUID)
- `TenantContextMiddleware` extracts tenant from JWT/subdomain
- Repository layer always filters by tenant — never trust client-supplied tenantId alone
- RLS policies in PostgreSQL as safety net

## Frontend (Next.js + packages/ui)

- App Router (`apps/web/src/app/`)
- Shared components in `packages/ui` — match `mockui-sn46` design tokens
- Page components in `apps/web/src/app/(roles)/<role>/<screen>/`
- API calls via typed client in `apps/web/src/lib/api/`
- No inline styles for reusable components — use CSS modules or Tailwind with design tokens

## Naming

| Item | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `devotee.service.ts` |
| Classes | PascalCase | `DevoteeService` |
| Interfaces | PascalCase, no `I` prefix | `DevoteeProfile` |
| DTOs | PascalCase + suffix | `CreateDevoteeDto` |
| DB tables | snake_case | `devotee_memberships` |
| API routes | kebab-case plural | `/api/v1/devotees` |

## Testing

- Unit tests for services (mock repositories)
- E2E tests for critical flows (booking, donation, sponsorship)
- Test files: `*.spec.ts` alongside source

## Git

- Conventional commits: `feat(devotee): add membership renewal endpoint`
- One module per PR when possible
