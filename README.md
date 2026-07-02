# Multi-Tenant Feature Flag Management System

A lightweight, zero-dependency-hell SaaS backend for managing feature toggles across multiple organizations. Built for the **Pragmatist Route**.

## Quick Start (Zero Config)

I value your time. You do not need Docker, PostgreSQL, or a frontend build pipeline to run this project. The database self-seeds on the first boot.

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`
2. **Start the server:**
   \`\`\`bash
   npm start
   \`\`\`
3. **Test the UI:**
   Open \`http://localhost:3000/admin.html\` and log in with the auto-seeded test credentials:
   * **Email:** admin@nike.com
   * **Password:** password123

## Architecture & Philosophy

Given the 8-hour time constraint, I prioritized **backend security, strict multi-tenancy, and reviewer experience** over frontend aesthetics. 

* **Backend Engine:** Node.js + Express.
* **Database:** SQLite (\`sqlite3\`). Chosen specifically because it runs entirely locally without requiring the reviewer to stand up a database server. 
* **Frontend:** Vanilla HTML/JS via \`fetch()\`. Avoiding React/Webpack eliminated configuration overhead and allowed me to focus purely on API design and data isolation.
* **Authentication:** Custom JWT implementation using \`bcryptjs\` for stateless, scalable session management.

## Security & Multi-Tenancy

In a SaaS environment, data leakage between tenants is the ultimate failure state. 
1. **The DB Constraint:** Feature flags are strictly bound to an \`organization_id\`.
2. **The Auth Bouncer:** The JWT payload stores the user's \`orgId\`. The frontend is never trusted to identify the tenant.
3. **The Tenant Guard:** Every \`PATCH\` or \`GET\` request explicitly includes \`WHERE organization_id = req.user.orgId\`, making it impossible for Tenant A to modify Tenant B's flags, even if they guess the flag's primary key.

## Future Improvements (With 1 Month Instead of 1 Week)

If this were moving to production, I would implement:
1. **Redis Caching:** The SDK check endpoint (\`GET /api/sdk/check\`) will be hit massively by end-users. Hitting the database on every page load is inefficient; flag states should be cached in memory.
2. **Robust ORM & Migrations:** Swap raw SQLite queries for Prisma or TypeORM connected to PostgreSQL to handle schema evolution safely.
3. **React/Next.js Frontend:** Rebuild the UI with a modern component library (like shadcn/ui) for better state management and error boundaries.
