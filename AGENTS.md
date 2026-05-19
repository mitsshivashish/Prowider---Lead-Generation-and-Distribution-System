# AI Agent Instructions - Prowider Lead Distribution Platform

## Project Overview

**Prowider** is a lead distribution platform where customers browse and request services (plumbing, electrical, cleaning, etc.), and the system allocates leads to qualified providers using a fair allocation algorithm with quota management.

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **Backend**: Express.js + Prisma ORM + PostgreSQL
- **Monorepo structure**: `backend/` and `frontend/` with shared root `package.json`

## Build & Development Commands

### Backend
```bash
cd backend
npm run dev              # Watch mode with tsx (port 3001)
npm run build           # Compile TypeScript to dist/
npm run start           # Run compiled dist/index.js
npm run prisma:generate # Generate Prisma client
npm run prisma:migrate  # Create new migration
npm run prisma:seed     # Seed database with test data
npm run prisma:reset    # Reset database to initial state
```

### Frontend
```bash
cd frontend
npm run dev             # Development server (port 3000)
npm run build           # Production build
npm run start           # Run production build
npm run lint            # Run linter
```

### Full Stack Development
```bash
# From root: Start both services
# Terminal 1: Backend (auto-reloads on file changes)
cd backend && npm run dev

# Terminal 2: Frontend (auto-reloads on file changes)
cd frontend && npm run dev
```

## Architecture & Conventions

### Backend Structure
- **`src/routes/`**: API endpoints organized by domain (auth, leads, providers, services, events, webhook)
- **`src/lib/`**: Core business logic
  - `allocation.ts`: Cal.com-style fair allocation algorithm with quota management and mandatory provider rules
  - `prisma.ts`: Prisma client singleton
  - `provider-token.ts`: JWT token generation/verification
- **`src/middleware/auth.ts`: Request authentication (admin token, provider JWT)
- **`prisma/schema.prisma`**: Database schema - tables for Service, Lead, Provider, ProviderLead, MandatoryRule, FairAllocationPool, WebhookCall

### Frontend Structure
- **`src/app/`**: Next.js App Router pages organized by user type
  - Public pages: `/` (homepage), `/service/[id]`, `/booking-confirmation`, `/request-service`
  - Customer pages: `/dashboard`, `/admin`
  - Provider pages: `/provider/login`, `/provider/dashboard`
- **`src/components/`**: Reusable React components (Header, Footer, Guards for auth)
- **`src/lib/`**: Utilities - API client, auth helpers, service catalog

### Key Design Decisions

1. **Allocation Algorithm** (`backend/src/lib/allocation.ts`)
   - Uses **mandatory provider assignment** + **fair allocation pool**
   - Fair allocation tie-break logic: most behind quota → least recently assigned
   - Database-level locking (`pg_advisory_xact_lock`) prevents concurrent over-assignment
   - Serializable transactions ensure consistency
   - Service-specific rules defined in `RULES` object

2. **Authentication**
   - Admin: Static token in `ADMIN_TOKEN` env var (Bearer header or cookie)
   - Providers: JWT tokens (Bearer header or `prowider_provider_token` cookie)
   - Customers: Next.js built-in session handling

3. **Database**
   - PostgreSQL with Prisma ORM
   - `FairAllocationPool` and `MandatoryRule` tables encode allocation rules
   - `ProviderLead` junction table tracks lead assignments
   - Timestamps on all entities for audit trails

4. **API Communication**
   - CORS restricted to frontend URL only (env var `FRONTEND_URL`)
   - Rate limiting enabled on backend
   - Webhook integration for provider notifications

## Development Workflow

### Adding a New API Endpoint
1. Create route handler in `backend/src/routes/<domain>.ts`
2. Register router in `backend/src/index.ts` via `app.use()`
3. Add Zod validation for request/response
4. Use `requireProvider` or `requireAdmin` middleware if authentication needed

### Modifying Database Schema
1. Update `backend/prisma/schema.prisma`
2. Run `npm run prisma:migrate` to create migration
3. Run `npm run prisma:seed` to update test data if needed
4. Commit migration files to version control

### Adding a New Frontend Page
1. Create component in `src/app/<path>/page.tsx`
2. Use `ProviderGuard` or `AdminGuard` for role-based access
3. Import API client from `src/lib/api.ts`
4. Use Tailwind CSS for styling (responsive-first design)

## Environment Variables

**Backend** (`.env.local`):
- `DATABASE_URL`: PostgreSQL connection string
- `PROVIDER_AUTH_SECRET`: Secret for JWT signing
- `ADMIN_TOKEN`: Static admin authentication token
- `PORT`: Server port (default 3001)
- `FRONTEND_URL`: Allowed CORS origin (default http://localhost:3000)

**Frontend** (`.env.local`):
- Backend API base URL configuration (see `src/lib/api.ts`)

## Common Pitfalls & Tips

### ⚠️ Allocation Algorithm
- **Don't bypass database locking**: All allocation operations must use serializable transactions with `pg_advisory_xact_lock`
- **Check `RULES` object**: Allocation rules are hardcoded in `backend/src/lib/allocation.ts` and must match business requirements
- **Fair allocation index**: Tracks which provider got assigned last in each pool to prevent bias

### ⚠️ Authentication
- Admin middleware checks Bearer header first, then cookie
- Provider JWT validation happens in `requireProvider` middleware
- Always validate env vars on startup (done in `backend/src/index.ts`)

### ⚠️ Prisma Migrations
- Run migrations in order: don't skip `.sql` files
- `prisma:reset` will drop and recreate schema (use for development only)
- After merging branches, regenerate client: `npm run prisma:generate`

### ⚠️ Frontend Auth Guards
- `ProviderGuard` and `AdminGuard` are client-side guards; always validate on backend
- Next.js 16 uses new "use client" directive for interactivity

## Key Files to Reference

- **Fair Allocation Logic**: [allocation.ts](backend/src/lib/allocation.ts)
- **Database Schema**: [schema.prisma](backend/prisma/schema.prisma)
- **Backend Routes**: [backend/src/routes](backend/src/routes)
- **Frontend Pages**: [frontend/src/app](frontend/src/app)
- **Frontend API Client**: [frontend/src/lib/api.ts](frontend/src/lib/api.ts)
- **Auth Middleware**: [backend/src/middleware/auth.ts](backend/src/middleware/auth.ts)

## Testing & Debugging

- **Database seed**: `cd backend && npm run prisma:seed` populates test providers, services, leads
- **Migrations**: `cd backend && npm run prisma:migrate` opens interactive UI
- **Reset environment**: `cd backend && npm run prisma:reset` (⚠️ destroys all data)
- **Console logs**: Backend logs go to terminal; Frontend logs go to browser console

### Test Credentials & Access

**1. Admin Portal**
- **URL:** `/login` (redirects to `/admin`)
- **Email:** `admin@example.com`
- **Password:** `admin1234`

**2. Provider Portal**
- **URL:** `/provider/login` (redirects to `/provider/dashboard`)
- **Email:** `provider1@prowider.com`
- **Password:** `provider123`

**3. Customer Portal**
- **URL:** `/dashboard`
- **Login Method:** Enter the customer email used during the request submission to view, confirm, or dispute the work.

---

**Last Updated**: May 2026
