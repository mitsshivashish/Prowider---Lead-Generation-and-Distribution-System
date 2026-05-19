# Prowider - Lead Generation & Distribution System

A full-stack, real-world simulation of a lead distribution platform. Customers can request services, and the backend engine automatically and fairly routes those leads to qualified providers while strictly enforcing monthly quotas, mandatory assignment rules, and database-level concurrency safety.

## 🚀 Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express.js, TypeScript, Zod (Validation)
- **Database:** PostgreSQL, Prisma ORM
- **Architecture:** Monorepo (Frontend + Backend)

---

## 🧠 Core Engineering & Architecture

This system was designed with a heavy focus on backend correctness, database consistency, and reliability under heavy concurrent loads. 

### 1. Lead Allocation Algorithm
When a lead is created, the system must allocate it to exactly 3 providers. The engine (`allocation.ts`) handles this in three distinct phases:
1. **Mandatory Routing:** First, the system checks the `MandatoryRule` table. If a service requires specific providers (e.g., Service 1 always goes to Provider 1), they are immediately assigned, provided they haven't exceeded their quota.
2. **Fair Pool Allocation:** To fill the remaining slots, the system evaluates the eligible providers in the `FairAllocationPool`. This is *not* random. Providers are ranked by:
   - **Shortfall:** Who has received the fewest leads overall (`allocationCount`).
   - **Tie-breaker:** Who has waited the longest since their last assignment (`lastAssignedAt`).
3. **Global Fallback:** If the service pool is exhausted and 3 providers haven't been found, the system falls back to the remaining global provider list, ranking them using the same fair distribution logic.

### 2. Concurrency & Transaction Safety
Lead allocation must be completely safe from race conditions. If 10 leads are generated at the exact same millisecond, the system must not assign 11 leads to a provider with a quota of 10.
- **Global Advisory Locks:** The allocation logic is wrapped in a Prisma transaction that immediately fires a PostgreSQL advisory lock (`SELECT pg_advisory_xact_lock(1000)`). 
- **Sequential Queuing:** This forces simultaneous requests to queue up safely at the database level and process sequentially. 
- **Connection Pooling Adjustments:** To ensure the queue doesn't crash limited free-tier cloud databases, the `pg` connection pool is explicitly capped (max: 3), and transaction `maxWait` / `timeout` parameters were extended to allow the queue time to resolve gracefully without dropping requests.

### 3. Webhook Safety & Idempotency
The platform includes a `/api/webhook` endpoint simulating a payment gateway confirming a provider's monthly subscription renewal (resetting their quota).
- **Idempotency Keys:** Every webhook request requires an `idempotencyKey`. 
- **Atomic Upserts:** Inside a transaction, the system checks the `WebhookCall` table. If the key exists, the request is safely ignored (status 200). If it's new, it resets the provider's `quotaResetDate` to `now()` and logs the key. This ensures that network retries from a payment gateway will *never* double-credit a provider.

### 4. Real-Time Dashboard Updates
Provider and Admin dashboards must reflect newly assigned leads without requiring a page refresh.
- **Background Polling:** Due to strict timeout limits on serverless and free-tier cloud hosting that aggressively kill open Server-Sent Event (SSE) streams, the dashboards utilize silent, lightweight background polling (`setInterval`). 
- **Result:** Data updates reliably every 5 seconds without screen flickering, network timeouts, or relying on fragile, long-standing connections.

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- PostgreSQL database (local or cloud)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/Prowider---Lead-Generation-and-Distribution-System.git
cd Prowider---Lead-Generation-and-Distribution-System
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env.local` file in the `backend` directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/prowider"
PROVIDER_AUTH_SECRET="super-secret-jwt-key"
ADMIN_TOKEN="super-secret-admin-token"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="password123"
FRONTEND_URL="http://localhost:3000"
PORT=3001
```

Initialize the database and start the server:
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed    # IMPORTANT: Seeds the required 3 Services and 8 Providers
npm run dev
```

### 3. Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend` directory:
```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

Start the frontend server:
```bash
npm run dev
```

---

## 🧪 Testing the Requirements

1. **Customer Request:** Navigate to `http://localhost:3000/request-service` and submit a lead.
2. **Duplicate Rule:** Try submitting a lead with the exact same phone number and service type. The database constraint will correctly block it.
3. **Provider Dashboard:** Log in at `http://localhost:3000/provider/login` using `provider1@prowider.com` / `provider123`. Watch the dashboard update in real-time as you submit new leads in another tab.
4. **Testing Tools (Webhooks & Concurrency):** Log in as an Admin (`http://localhost:3000/login`). Go to `http://localhost:3000/test-tools`. 
   - Click **Generate 10 Leads** to stress-test the `pg_advisory_xact_lock`.
   - Click **Test Idempotency** to verify duplicate webhooks are safely ignored.
5. **Completion Workflow:** Have a provider click "Request Completion" on a job. Go to the Customer Portal (`http://localhost:3000/dashboard`), enter the customer's email, and "Dispute" the job. Finally, go to the Admin Dashboard to resolve the dispute and automatically re-allocate the lead!## 🔑 Test Credentials & Access Routes

To easily evaluate the different roles within the platform, please use the following routes and default credentials:

**1. Admin Dashboard**
- **URL:** `/login` (redirects to `/admin` upon success)
- **Email:** `admin@example.com`
- **Password:** `admin1234`
*(Note: Ensure your `.env` file matches these admin credentials).*

**2. Provider Dashboard**
- **URL:** `/provider/login` (redirects to `/provider/dashboard`)
- **Email:** `provider1@prowider.com`
- **Password:** `provider123`

**3. Customer Portal**
- **URL:** `/dashboard`
- **Login Method:** No password required for this simulation. Simply enter the email address used when submitting the "Request Service" form to view your requests and pass/confirm the work.
