# Ikonex Academy - Student Management System

![Ikonex Logo](public/icons/icons8-school-100.png)

A "Clean Premium" ecosystem designed for high-end educational institutions. Ikonex provides a unified, secure, and visually stunning administrative console for Faculty, Finance, and System Administrators.

---

## 🌟 Core Features

The system is strictly partitioned via Role-Based Access Control (RBAC), providing tailored experiences for every user.

### 🛡️ System Administrators
*   **Executive Dashboard:** Global metrics tracking total students, school-wide averages, daily attendance rates, and revenue collection.
*   **Access Control Center:** A "Service-Role-Free" invitation system. Admins pre-authorize staff emails and assign roles (Teacher, Bursar, Admin) before they even create an account.
*   **Performance Analytics:** Real-time Recharts visualizations showing grade distributions and historical performance trends across academic terms.

### 🍎 Faculty (Teachers)
*   **Faculty Console:** A dedicated hub tracking individual teaching assignments, class averages, and subject-specific performance graphs.
*   **Classroom Roster:** "My Classes" provides an interactive directory of assigned streams and student portfolios.
*   **Score Entry:** A rapid-entry grid for Continuous Assessment Tests (CATs) and Exams, complete with bulk CSV upload capabilities and automatic duplicate prevention.
*   **Curriculum Planning:** A digital Lesson Plan module to outline weekly objectives, content, and required resources.
*   **Attendance:** Streamlined daily check-ins for active classes.

### 💰 Finance (Bursars)
*   **Finance Overview:** A comprehensive dashboard tracking Total Revenue, Total Expenses, Scholarships awarded, and Net Balance.
*   **Fee Collections:** Record incoming payments with auto-generated, professional PDF receipts (`@react-pdf/renderer`).
*   **Expenditure Log:** Track outgoing funds categorized by Salary, Supplies, Maintenance, and Utilities.
*   **Scholarships & Waivers:** Award and log financial assistance directly to specific student profiles.

---

## 🛠️ Technology Stack

Ikonex is built on a bleeding-edge, server-side rendered architecture optimized for the Edge.

*   **Frontend:** React 19, TypeScript
*   **Routing & SSR:** TanStack Router, TanStack Start
*   **State & Fetching:** TanStack Query v5
*   **Styling & UI:** Tailwind CSS v4, Radix UI (shadcn/ui), Lucide Icons
*   **Analytics & Exports:** Recharts, `@react-pdf/renderer`
*   **Database & Auth:** Supabase (PostgreSQL, PostgREST, Auth with RLS)
*   **Deployment:** Cloudflare Workers (via Nitro `cloudflare-module` preset)

---

## 🚀 Getting Started

### Prerequisites
*   Node.js 20+
*   npm or bun
*   A Supabase project (for database and auth)
*   A Cloudflare account (for deployment)

### 1. Local Setup
Clone the repository and install dependencies:
```bash
git clone https://github.com/stanlley-locke/ikonex_student_management.git
cd ikonex_student_management
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Migration
Ensure your Supabase project is seeded with the required schema. You can run the SQL files located in `supabase/migrations/` sequentially via the Supabase SQL Editor.

### 4. Run Development Server
Start the Vite development server with hot-module replacement:
```bash
npm run dev
```

---

## ☁️ Deployment (Cloudflare Workers)

This project is configured to deploy seamlessly to Cloudflare Workers using the Nitro engine.

1.  **Authenticate Wrangler:**
    ```bash
    npx wrangler login
    ```
2.  **Deploy:**
    The `deploy` script automatically builds the SSR application and publishes it to Cloudflare.
    ```bash
    npm run deploy
    ```

*Note: Ensure your Cloudflare environment variables (`VITE_SUPABASE_URL`, etc.) are configured in the Cloudflare Dashboard under your Worker settings.*

---

## 📖 Deep Dive Documentation
For detailed information on the database schema, Row Level Security (RLS) policies, and the internal TanStack routing structure, please refer to the [Technical Documentation](DOCUMENTATION.md).# ikonex_student_management-main
