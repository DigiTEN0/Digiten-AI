# Digiten.ai - CPQ Platform

## Overview
Multi-tenant SaaS CPQ (Configure, Price, Quote) platform for Dutch service companies. Built with Express + React + PostgreSQL.

## Architecture
- **Frontend**: React 18 + Vite + Tailwind CSS + shadcn/ui + wouter routing + TanStack Query
- **Backend**: Express 5 + Passport.js (local strategy) + express-session (pg store)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Session-based with scrypt password hashing (tenant), SHA-256 (client portal)
- **File Uploads**: multer → `/uploads/` directory (logos, dossier files)
- **PDF Generation**: pdfkit (minimalist branded invoice PDFs with org accent color, clean typography, IBAN payment section, KVK, BTW)
- **Email**: Brevo API (BREVO_API_KEY secret); verified sender = `digiten.nl@gmail.com`; reply-to = tenant email

## Key Entities
- **Organization**: Company settings, branding, VAT info, logo (with `logoSize` slider), `slug` for pretty URLs, invoice prefix, `iban`, `kvkNumber`, `openingHours` (jsonb per weekday with open/close/enabled), `subscriptionStatus` (trial/active/expired), `trialEndsAt`, `maxEmployees` (default 3)
- **User**: Tenant users linked to organization. Roles: `admin` (owner), `medewerker` (employee). Fields: phone, fullName
- **PriceMatrixItem**: Services/products with pricing, conditional logic (`dependsOnItemId`, `dependsOnCondition`: "always"/"when_selected"/"when_not_selected")
- **Quotation**: Quotes with client info, status flow, signature, audit log, invoiceNumber, desiredStartDate, `desiredStartTime`, `invoiceNotes`, `assignedEmployeeId`
- **QuoteItem**: Line items within a quote
- **FormTemplate**: Lead form configuration
- **CalendarEvent**: Availability management (unavailable/booked/requested dates) with `startTime`/`endTime` fields, `employeeId` for per-employee availability
- **ClientUser**: Auto-created client accounts for portal access (email, hashed password, loginToken for auto-login)
- **Dossier**: Client dossiers linked to quotations (status: open/completed/signed), `assignedEmployeeId`
- **DossierEntry**: Files/photos/notes within a dossier (type: photo/note/file), editable `caption`
- **DossierMessage**: Chat messages between tenant and client within a dossier, supports `filePath` for file attachments
- **DossierSignature**: Client signature with optional feedback text and star rating (1-5)
- **Notification**: System notifications for tenant (types: new_lead, quote_approved, quote_rejected, new_message, dossier_signed)

## Quote Status Flow
`new_lead` → `quote_sent` → `viewed` → `approved` / `rejected` → `invoiced` → `paid`

- On approval: auto-creates "booked" calendar event on desiredStartDate+time, removes "requested" event
- On approval/rejection: creates notification for tenant
- On invoice send: auto-creates ClientUser + Dossier, sends portal access email, auto-adds invoice PDF as dossier entry

## Employee (Medewerker) System
- Owners can create employees (role: "medewerker") via `/medewerkers` page
- Employees receive email invite with login credentials
- Max employees based on plan (default 3 for Starter)
- Employees only see their assigned quotations, dossiers, and calendar events
- Owner assigns employees to quotations (cascades to dossier + calendar events)
- Per-employee availability: public lead form only blocks a time slot when ALL employees are unavailable

## Subscription / Trial System
- New orgs start with 6-day trial (subscriptionStatus: "trial", trialEndsAt: created_at + 6 days)
- After trial expires: subscriptionStatus → "expired", API returns 403 with "trial_expired"
- Subscription page at `/abonnement` shows plan info, trial countdown, features
- "Activeer" button (stub) activates subscription
- Employee count enforced against maxEmployees limit

## Pages
### Authenticated (sidebar layout with notification bell)
- `/dashboard` - KPIs (revenue, pipeline, leads, open invoices), conversion funnel visualization, recent activity
- `/quotes` - "Leads" kanban board with drag-and-drop: Verstuurd, Bekeken, Geaccepteerd, Afgewezen, Gefactureerd, Betaald. Status filter dropdown. (No new_lead column — quotes are auto-sent)
- `/quotes/new` - Quote builder with price matrix
- `/quotes/:id` - Quote detail with timeline, PDF download, send invoice (with optional notes dialog), mark paid
- `/dossiers` - List all client dossiers with status badges
- `/dossiers/:id` - Dossier detail: upload photos/files with captions, split into "Onze bestanden" (tenant) and "Van klant" (client) sections, image previews, PDF previews with titles, WhatsApp-style chat, file attachments in chat, mark complete, view signature/feedback
- `/medewerkers` - Employee management: CRUD, invite via email, assign to quotations (owner only)
- `/price-matrix` - CRUD for services/products with conditional logic
- `/calendar` - Monthly calendar with availability management (employee-filtered for medewerkers)
- `/abonnement` - Subscription management with 3-plan comparison (Starter €95/mo, Pro €145/mo, Enterprise op maat). Trial banner, plan switching, feature comparison. Owner only.
- `/settings` - Organization settings with 4 tabs (owner only)
- `/admin` - Super admin dashboard (only for `isAdmin` users): user management, org overview

### Public (no auth)
- `/` - Landing page with features, pricing, FAQ
- `/auth` - Login/register
- `/quote/:token` - Client quote view with digital signature
- `/lead-form/:orgId` or `/:slug` - Calendly-style multi-step booking form with per-employee availability
- `/client/login` - Client portal login (email + password)
- `/client/portal/:token` - Client dossier view: WhatsApp-style chat with photo upload, signature pad when completed

## Sidebar Navigation
### Owner sees:
Dashboard, Leads, Dossiers, Agenda, Medewerkers, Prijsmatrix, Abonnement, Instellingen

### Employee (medewerker) sees:
Dashboard, Leads, Dossiers, Agenda

## Email Notifications
- New lead → tenant notification email
- Invoice sent → client email with PDF attachment + portal access
- Client message/upload → tenant email notification
- Tenant message → client email notification
- Employee invite → email with login credentials

## API Endpoints (notable)
- `POST /api/organization/logo` - Logo upload (multer)
- `PATCH /api/organization` - Update org settings
- `GET /api/public/calendar/:org/unavailable` - Public unavailable dates (per-employee aware)
- `GET /api/public/calendar/:org/booked-times` - Public booked times (per-employee aware)
- `GET /api/employees` - List employees (owner only)
- `POST /api/employees` - Create employee with invite email (owner only)
- `PATCH /api/employees/:id` - Update employee (owner only)
- `DELETE /api/employees/:id` - Delete employee (owner only)
- `POST /api/quotations/:id/assign` - Assign employee to quotation (cascades to dossier + calendar)
- `GET /api/subscription` - Plan info (status, trial end, employee count/max)
- `POST /api/subscription/activate` - Stub activation
- `POST /api/quotations/:id/send-invoice` - Email invoice, auto-create client+dossier, save PDF to dossier
- `PATCH /api/dossiers/:id/entries/:entryId` - Update entry caption
- `POST /api/dossiers/:id/messages` - Tenant chat with file upload support
- `POST /api/client/dossier/:token/messages` - Client chat with file upload support + email notifications

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Express session secret
- `BREVO_API_KEY` - Brevo transactional email API key
- `PORT` - Server port (default 5000)

## File Structure
```
shared/schema.ts          - Drizzle schema + Zod types
server/db.ts              - Database connection
server/auth.ts            - Passport setup + auth routes
server/storage.ts         - Storage interface + DB implementation
server/routes.ts          - API routes
server/seed.ts            - Seed data
server/pdf-generator.ts   - Invoice PDF generation (pdfkit, minimalist branded design)
server/email-sender.ts    - Email sending via Brevo API + HTML templates
uploads/                  - Uploaded files (logos, dossier files)
client/src/App.tsx        - Router + layout
client/src/hooks/         - useAuth, useToast, useMobile
client/src/pages/         - All page components
client/src/components/    - Sidebar, notification bell, UI components
client/src/lib/           - queryClient, utils
```

## User Rules
- ABSOLUUT GEEN MOCK DATA — all data must come from PostgreSQL
- Language: Dutch (nl-NL) for all UI text
