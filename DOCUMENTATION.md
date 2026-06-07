# Ikonex Academy - Technical Documentation

This document provides a comprehensive technical overview of the Ikonex Academy Student Management System (SMS). It details the architectural decisions, database schemas, authorization flow, and deployment strategies.

## 1. Architecture Overview

Ikonex SMS is built on a modern, edge-ready, server-side rendered (SSR) architecture utilizing **TanStack Start**.

*   **Frontend Framework:** React 19 + TypeScript.
*   **Routing & SSR:** TanStack Router and TanStack Start.
*   **Data Fetching & State:** TanStack Query (`@tanstack/react-query`).
*   **Styling & UI:** Tailwind CSS v4, Radix UI (shadcn/ui), Recharts, Lucide Icons.
*   **Backend / Database:** Supabase (PostgreSQL, Auth, PostgREST API).
*   **Deployment Target:** Cloudflare Workers (via Nitro `cloudflare-module` preset).
*   **PDF Generation:** Client-side blob generation using `@react-pdf/renderer`.

## 2. Authentication & Authorization (RBAC)

The system employs a strict Role-Based Access Control (RBAC) mechanism partitioned into three primary roles: `ADMIN`, `TEACHER`, and `BURSAR`.

### The "Service-Role-Free" Invitation Model
To maintain strict security without exposing elevated Supabase Service Role keys, user creation is handled via an invitation model:
1.  **Authorization:** An `ADMIN` adds a staff member's email and role to the `authorized_staff` table.
2.  **Registration:** The staff member uses the "Setup" tab on the login portal to create an account using that exact email.
3.  **Synchronization:** Upon login, the system (`auth.tsx`) queries the `authorized_staff` table. If an authorization exists, it automatically upserts the user's `profiles` record with the designated role.
4.  **Route Gating:** The main authenticated layout (`src/routes/_authenticated/route.tsx`) acts as a global guard. Its `beforeLoad` function checks the user's role and redirects unauthorized access (preventing rendering loops).

## 3. Database Schema

The system relies on a heavily relational PostgreSQL database hosted on Supabase. Row Level Security (RLS) policies govern data access based on the user's role.

### Core Tables

*   `profiles`: The base user table linked to `auth.users`. Contains `id`, `full_name`, and `role`.
*   `authorized_staff`: The pre-approval registry. Contains `email`, `full_name`, and `role`.

### Academic Structure

*   `terms`: Academic periods (`id`, `name`, `year`, `is_active`).
*   `streams`: Class groupings (e.g., Form 1A) (`id`, `name`).
*   `subjects`: Academic subjects (`id`, `name`, `code`).
*   `students`: Student records (`id`, `full_name`, `admission_number`, `stream_id`).
*   `teachers`: Faculty records, linked to `profiles` (`id`, `profile_id`, `full_name`, `email`).
*   `teacher_assignments`: Junction table linking Teachers to Streams and Subjects.

### Academic Operations

*   `scores`: Exam and CAT marks (`id`, `student_id`, `subject_id`, `term_id`, `assessment_type`, `marks`).
*   `grading_scales`: Rules for converting numerical marks to grades and points.
*   `attendance`: Daily student check-ins (`student_id`, `date`, `status`, `recorded_by`).
*   `lesson_plans`: Teacher curriculum planning (`id`, `teacher_id`, `stream_id`, `subject_id`, `week_number`, `title`, `objectives`, `content`, `resources`).

### Finance Operations

*  `fee_structures`: Base term fees per stream (`stream_id`, `term_id`, `amount`).
*   `fee_payments`: Incomes (`id`, `student_id`, `amount`, `method`, `created_at`, `recorded_by`).
*   `expenses`: Outgoings (`id`, `category`, `amount`, `description`, `expense_date`, `recorded_by`).
*   `scholarships`: Fee waivers/discounts (`id`, `student_id`, `amount`, `description`, `awarded_at`).

## 4. Frontend Ecosystem

### TanStack Router Integration
Routes are explicitly defined and type-safe. The `/_authenticated` layout wraps all secure routes.
*   `/dashboard`: A polymorphic component that renders entirely different UI hubs based on the active role (`AdminDashboard`, `TeacherDashboard`, `BursarDashboard`).
*   `/my-classes`: Faculty specific. Uses local state to swap between active teaching assignments and view rosters.
*   `/scores`: Utilizes a complex state matrix to map `students` against `existingScores` for rapid bulk editing and CSV importing.

### Real-Time Charts & Analytics
The dashboard uses `recharts` to render real-time visualizations. Data is aggressively aggregated in a single `useQuery` fetch to minimize network waterfalls, utilizing `Promise.all` across multiple Supabase tables.

1. Deployment Guide (Cloudflare Workers)

The application uses Nitro as its underlying server engine, configured specifically for Cloudflare's Edge network.

### Build Configuration (`vite.config.ts`)
The Vite configuration specifies the `cloudflare-module` preset. This instructs Nitro to compile the server code into an ES Module format compatible with Cloudflare Workers.

```typescript
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  plugins: [],
  nitro: {
    preset: "cloudflare-module"
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
```

  Wrangler Configuration (`wrangler.jsonc`)
Cloudflare Wrangler uses this file to target the compiled `.output` directory.

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "ikonex",
  "compatibility_date": "2026-06-05",
  "main": ".output/server/index.mjs",
  "assets": {
    "directory": ".output/public",
    "binding": "ASSETS"
  },
  "observability": { "enabled": true },
  "compatibility_flags": [ "nodejs_compat" ]
}
```

### Deployment Execution
1.  Run `npm run build`. This generates the `.output/public` (static assets) and `.output/server` (worker logic) directories.
2.  Run `npx wrangler deploy` to push the code to the Cloudflare Edge.
3.  The command `npm run deploy` combines these steps automatically.
