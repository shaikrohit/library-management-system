# Deployment & Execution Guide — Library Management System

## 1. Prerequisites

- Node.js 20+ (tested on Node.js v22.23.5) and npm 10+
- A Supabase project (Free plan)
- A Netlify site (Free plan) for static SPA hosting

---

## 2. Database Setup (Supabase PostgreSQL)

Migrations are stored in `supabase/migrations/`:

1. `20261127000001_create_author.sql`
2. `20261127000002_create_book.sql`
3. `20261127000003_create_book_author.sql`
4. `20261127000004_create_member.sql`
5. `20261127000005_create_app_user.sql`
6. `20261127000006_create_book_transaction.sql`
7. `20261127000007_create_fine.sql`
8. `20261127000008_rls_triggers_and_rpcs.sql`
9. `20261127000009_seed_sample_data.sql`
10. `20261127000010_harden_security_definer_privileges.sql`

These migrations are applied to the Supabase project (`qmsibpoedmxzfvoesnph`), creating all tables, constraints, RLS policies, stored procedures, and 5 demonstration books with 6 authors.

---

## 3. Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/shaikrohit/library-management-system.git
   cd library-management-system
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables by copying `.env.example` to `.env`:
   ```env
   VITE_SUPABASE_URL=https://qmsibpoedmxzfvoesnph.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
   ```
4. Start the local Vite development server:
   ```bash
   npm run dev
   ```
5. Run unit tests and production build verification:
   ```bash
   npm test
   npm run build
   ```

---

## 4. Production Deployment on Netlify

1. Set the public frontend environment variables in Netlify Site Settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
2. Configure build settings (already defined in `netlify.toml`):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **SPA Routing:** `/* -> /index.html (200)`
3. Deploy via GitHub Continuous Deployment or Netlify CLI (`netlify deploy --prod`).
