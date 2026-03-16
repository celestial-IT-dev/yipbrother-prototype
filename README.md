# Yip Brother OMS — Operation Management System

> A web-based order tracking and workflow management system for Yip Brother's lorry body manufacturing operations.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Setup](#local-setup)
  - [Environment Variables](#environment-variables)
- [Supabase Setup](#supabase-setup)
  - [Database Schema](#database-schema)
  - [Storage Bucket](#storage-bucket)
  - [Creating Users](#creating-users)
- [User Roles & Permissions](#user-roles--permissions)
- [Order Workflow](#order-workflow)
- [Feature Reference](#feature-reference)
- [Scripts](#scripts)
- [Deployment](#deployment)
  - [GitHub Pages](#github-pages)
- [Future Enhancements](#future-enhancements)

---

## Overview

The OMS (Operation Management System) is designed to:

- Track customer orders from creation through to final closure
- Enforce a structured, role-based status workflow across departments
- Provide management with real-time visibility of all active orders
- Maintain a full audit trail of every status change and action
- Support file attachments (quotations, design drawings, inspection photos, etc.)

This system replaces informal tracking via WhatsApp, spreadsheets, and paper forms.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Build Tool | [Vite 8](https://vitejs.dev/) |
| UI Library | [React-Bootstrap 2](https://react-bootstrap.netlify.app/) + [Bootstrap 5](https://getbootstrap.com/) |
| Routing | [React Router DOM 7](https://reactrouter.com/) |
| Backend / DB | [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage) |
| File Upload | [react-dropzone](https://react-dropzone.js.org/) |
| Linting | ESLint with TypeScript rules |

---

## Project Structure

```
yip-brother-oms/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── StatusBreakdownTable.tsx   # Progress-bar breakdown of orders by status
│   │   │   └── SummaryCards.tsx           # KPI summary cards (active, overdue, on hold…)
│   │   ├── layout/
│   │   │   ├── AppShell.tsx               # Top navbar + page wrapper
│   │   │   └── ProtectedRoute.tsx         # Auth guard for private routes
│   │   ├── orders/
│   │   │   ├── AttachmentsPanel.tsx       # Attachment gallery with lightbox
│   │   │   ├── FileUpload.tsx             # Drag-and-drop upload component
│   │   │   ├── OrderForm.tsx              # Create / edit order form
│   │   │   ├── OrderList.tsx              # Searchable, filterable orders table
│   │   │   ├── StatusBadge.tsx            # Coloured status badge pill
│   │   │   ├── StatusTimeline.tsx         # Vertical audit-trail timeline
│   │   │   └── StatusUpdateModal.tsx      # Status change modal with file attachment
│   │   └── workflow/
│   │       └── WorkflowDiagram.tsx        # Visual workflow map with current position
│   ├── context/
│   │   └── AuthContext.tsx                # Supabase auth state + profile context
│   ├── lib/
│   │   ├── constants.ts                   # Statuses, roles, colour map, type exports
│   │   ├── supabaseClient.ts              # Supabase JS client initialisation
│   │   └── workflowRules.ts              # Allowed transitions + role gate logic
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── EditOrderPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── NewOrderPage.tsx
│   │   ├── OrderDetailPage.tsx
│   │   ├── OrdersPage.tsx
│   │   └── WorkflowPage.tsx
│   ├── App.tsx                            # Router + auth provider wiring
│   ├── index.css                          # Global design system (CSS variables, components)
│   └── main.tsx                           # Entry point
├── supabase_schema.sql                    # Core DB schema (run first)
├── supabase_attachments_schema.sql        # Attachments table + storage bucket (run second)
├── .env.example                           # Environment variable template
├── .gitignore
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- npm ≥ 9 (bundled with Node)
- A [Supabase](https://supabase.com/) project (free tier is fine)

### Local Setup

```bash
# 1. Clone / copy the project
cd yip-brother-oms

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your Supabase project URL and anon key

# 4. Start the dev server
npm run dev
```

The app will be available at **http://localhost:5173** (or the port Vite assigns).

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

> ⚠️ **Never commit `.env`** — it contains live credentials. The file is already in `.gitignore`.

Find these values in your Supabase project under **Settings → API**.

---

## Supabase Setup

### Database Schema

Run the two SQL files in your **Supabase SQL Editor** in this order:

**1. Core schema** (`supabase_schema.sql`)
- `profiles` table (extends `auth.users`) — stores full name and role
- `orders` table — all order fields including milestones and payment tracking
- `order_status_history` table — full audit trail of every status change
- Row Level Security (RLS) policies

**2. Attachments schema** (`supabase_attachments_schema.sql`)
- `order_attachments` table — file metadata linked to orders
- Creates the `order-attachments` Storage bucket (public)
- Storage RLS policies for upload / view / delete

### Storage Bucket

The attachments SQL creates the `order-attachments` bucket automatically. If it does not appear, create it manually in **Supabase → Storage** with:

- **Name**: `order-attachments`
- **Public bucket**: ✅ enabled (required for thumbnail display)

### Creating Users

Users are managed via **Supabase Auth** (email + password). After creating a user in the Auth dashboard, a profile row is auto-inserted by a database trigger with the default role `sales`.

To assign a different role, run in the SQL editor:

```sql
UPDATE public.profiles
SET role = 'admin'   -- options: sales | admin | engineer | designer | qa_qc
WHERE id = 'the-user-uuid-here';
```

Or manually insert a profile if the trigger did not fire:

```sql
INSERT INTO public.profiles (id, full_name, role)
VALUES ('user-uuid', 'Ahmad Sales', 'sales');
```

---

## User Roles & Permissions

| Role | Key Responsibilities |
|------|---------------------|
| `sales` | Create orders, customer confirmation, payment tracking, delivery, sign-off |
| `admin` | Same as Sales — full lifecycle access |
| `engineer` | Engineering release through production stages, material planning |
| `designer` | Design progress and design approval management |
| `qa_qc` | Quality inspection, rework handling, delivery readiness |

Role permissions are enforced in `src/lib/workflowRules.ts`. Each status has an explicit list of allowed next statuses and which roles can perform the transition.

---

## Order Workflow

Orders follow a linear workflow with exception branches:

```
Draft
  → Pending Customer Confirmation
  → Customer Confirmed
  → Pending Payment
  → Order Released to Engineering
  → Design in Progress
  → Pending Design Approval          ← can reject back to Design in Progress
  → Material Planning
  → Waiting for Materials
  → Materials Ready
  → Pending to Start
  → Production Started
  → Fabrication in Progress
  → Assembly in Progress
  → Painting in Progress
  → Installation in Progress
  → Quality Inspection               ← can send to Rework Required → back to Production
  → Ready for Delivery / Collection
  → Inquire Delivery Method from Customer
  → Pending Final Payment
  → Sign Off
  → Completed / Closed ✅
```

**Exception statuses** (can occur at relevant points):
- `On Hold` — any active order can be paused (mandatory reason required)
- `Rework Required` — from Quality Inspection (mandatory reason required)
- `Rejected / Revision Requested` — from Pending Design Approval (mandatory reason required)
- `Cancelled` — any active order (mandatory reason required)

**Business rules enforced:**
- A mandatory remark/comment is required for On Hold, Cancelled, Rework Required, and Rejected statuses
- Only the correct role can advance an order at each stage
- Terminal statuses (Completed / Closed, Cancelled) cannot be changed further

---

## Feature Reference

### Dashboard
- KPI summary cards: active, overdue, on hold, completed, cancelled, total
- Status breakdown chart with proportional progress bars per status

### Orders List
- Full-text search by order number, customer name, or salesperson
- Filter by status
- Overdue rows highlighted in amber
- Direct link to order detail

### Order Detail
- **Order Details tab** — customer, vehicle, manufacturing, financial, delivery info
- **History tab** — full status change audit trail with timestamps, user, role, and remark
- **Attachments tab** — upload and manage all files associated with an order
- **Milestones tab** — key date tracking across the lifecycle
- **Workflow tab** — visual map of the full workflow with current position highlighted

### Status Update
- Role-gated — the Update Status button only appears if your role can act at the current stage
- Inline file upload — attach supporting documents as part of the status change
- Files are tagged with the status context they were uploaded against

### File Attachments
- Supported formats: PDF, JPEG, PNG, GIF, WebP, Word (.doc / .docx), Excel (.xls / .xlsx)
- Max size: 20 MB per file; multiple files can be dropped at once
- Image thumbnails with click-to-zoom lightbox
- PDF preview in an embedded iframe lightbox
- Files stored in Supabase Storage; metadata in `order_attachments` table
- Uploader and admin users can delete files

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local development server with hot reload |
| `npm run build` | Type-check + compile production bundle to `dist/` |
| `npm run preview` | Serve the production build locally for testing |
| `npm run lint` | Run ESLint across all source files |

---

## Deployment

This app is a static Vite build, so it can be deployed to any static host as long as you provide the required `VITE_*` environment variables at build time.

### GitHub Pages

This repository now includes a workflow at `.github/workflows/deploy-github-pages.yml` that builds and deploys the app to GitHub Pages whenever you push to the `main` branch.

#### Before you deploy

1. Push this project to a GitHub repository.
2. In GitHub, open **Settings → Secrets and variables → Actions**.
3. Add these repository secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Open **Settings → Pages**.
5. Set **Source** to **GitHub Actions**.

> The workflow automatically uses `/${repository-name}/` as the app base path, which is the correct setup for a project GitHub Pages site such as `https://your-username.github.io/yip-brother-oms/`.

#### First deployment

- Push to `main`.
- Wait for the **Deploy to GitHub Pages** workflow to finish.
- Your site will be published at:
  - `https://<your-github-username>.github.io/<your-repository-name>/`

#### Local production check for GitHub Pages

If you want to preview the same base path locally, build with `VITE_BASE_PATH` set to your repository name before running the preview server.

**PowerShell:**

```powershell
$env:BASE_PATH = "/yip-brother-oms/"
npm run build:github-pages
npm run preview
```

Then open the preview URL shown in the terminal and browse to `/yip-brother-oms/`.

#### Notes and limitations

- This app uses `BrowserRouter`, and the router basename is now aligned with the configured Vite base path.
- GitHub Pages works best when users enter through the published app URL. Deep-link refreshes on arbitrary nested routes can still be limited on static hosts unless you add a custom 404 fallback strategy.
- The Supabase anon key is safe to expose in client builds, but it still must be supplied through GitHub repository secrets for automated builds.

## Future Enhancements

Potential improvements identified for future phases:

- [ ] Email / in-app notifications on status changes
- [ ] Customer portal for read-only progress tracking
- [ ] Barcode / QR code job card scanning on the workshop floor
- [ ] Integration with accounting or invoicing system
- [ ] Integration with inventory / warehouse management
- [ ] Mobile-optimised interface for workshop staff
- [ ] KPI reporting — order lead time and department performance dashboards
- [ ] Bulk status operations for admin users
- [ ] Overdue alert reminders and escalation rules

---

*Built for Yip Brother · March 2026*
