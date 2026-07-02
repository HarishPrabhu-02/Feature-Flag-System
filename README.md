# Multi-Tenant Feature Flag Management System

A robust, self-contained SaaS backend for managing feature toggles across multiple organizations. Designed with a strict focus on multi-tenant data isolation, security, and developer ergonomics. Submitted for the **Pragmatist Route**.

## Quick Start (Zero Configuration)

This repository is designed to run immediately without requiring Docker, PostgreSQL, or frontend build pipelines. The database will automatically provision its schema and seed test data upon the first boot.

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`
2. **Start the server:**
   \`\`\`bash
   npm start
   \`\`\`
3. **Test the UI:**
   Navigate to \`http://localhost:3000/admin.html\` and log in using the auto-seeded test credentials:
   * **Email:** admin@nike.com
   * **Password:** password123

## System Architecture

Given the time constraints of the assignment, I prioritized backend security, strict multi-tenancy, and reviewer experience over frontend aesthetics.

* **Backend Engine:** Node.js + Express.
* **Database:** SQLite (\`sqlite3\`). Selected specifically to provide a frictionless, zero-configuration evaluation experience. 
* **Frontend:** Vanilla HTML/JS via native \`fetch()\`. Avoiding heavy frameworks (React/Webpack) eliminated configuration bloat, allowing me to focus entirely on API design, data isolation, and core logic.
* **Authentication:** Custom stateless JWT implementation using \`bcryptjs\` for secure session management without relying on third-party providers.

## Multi-Tenant Security Model

In a shared-infrastructure SaaS environment, data leakage between tenants is the ultimate failure state. This system enforces isolation at three distinct layers:

1. **Schema Constraints:** Every feature flag is strictly bound to an \`organization_id\` at the database level.
2. **Stateless Authentication:** The tenant's identity (\`orgId\`) is cryptographically signed directly into the JWT payload upon login. The backend never trusts the client to declare which organization it belongs to.
3. **Authorization Guards:** All state-mutating endpoints enforce strict ownership checks. For example, \`PATCH\` requests execute against \`WHERE id = ? AND organization_id = req.user.orgId\`, making horizontal privilege escalation impossible.

## Production Roadmap 

If tasked with scaling this prototype for production over a 30-day cycle, I would implement the following:

1. **In-Memory Caching (Redis):** The public SDK check endpoint (\`POST /api/sdk/check\`) will experience high read-throughput from end-users. Hitting a disk-based database on every page load is inefficient; flag states must be cached.
2. **Robust ORM & Migrations:** Swap raw SQLite queries for Prisma or TypeORM connected to a PostgreSQL instance to handle concurrent writes and safe schema evolution.
3. **Modernized Client:** Rebuild the static HTML views into a React/Next.js dashboard with proper state management, component reusability, and error boundaries.

## Acknowledgment of Generative AI  
Google Gemini was used throughout for code generation, design choices and project setup.
