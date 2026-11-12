# ROADMAP: Galmee Clinic

## M-next: Tier 1 clinic screens (build these first)

- [x] Patient search + register screen (`cl_register_patient`)
- [x] Reception queue screen (`cl_visits` by status) + open visit
- [x] Price list of services (owner/manager edit, reception reads)
- [x] Visit screen: add services (`cl_add_service`), running total
- [ ] Close & bill flow (`cl_close_visit_and_bill`) + cash/Telebirr
- [ ] Receipt (58 mm) for visit
- [ ] Lab request form (`cl_request_lab`)
- [ ] Lab result entry screen (`cl_enter_lab_results`), lab role only
- [x] Status transitions wired (waiting→doctor→lab; done comes from billing)

## M-after: Tier 2 and 3

- [ ] Daily income by service screen
- [ ] Patient card (visits, labs, balance) screen; attachments upload comes with this, not before
- [ ] Appointment calendar on `bookings` + day-before SMS rows
- [ ] Partial payment + statement
- [ ] Telegram-to-doctor on lab completion (notifications row)
- [ ] Clinical role assignment UI (owner)
- [ ] Monthly report + CSV export

## M0: Foundation (shared pattern for all Galmee products)

- [x] Next.js App Router + TS + Tailwind + shadcn/ui scaffold; `npm run build` passes
- [x] PWA manifest, icons, offline shell; installs from Android Chrome
- [x] Supabase client (`@supabase/ssr`) with `.env.example` values; middleware session refresh
- [x] Auth: sign up, log in, log out; after first signup call `create_tenant` (vertical `clinic`)
- [x] next-intl with `am`, `om`, `en`; language switcher; Ethiopic-friendly font (Noto Sans Ethiopic)
- [x] Ethiopian calendar date display helper + tests
- [x] App shell: bottom navigation on mobile, sidebar on desktop, tenant name and logo
- [ ] Staff management (owner only): invite staff, set role
- [x] Generated Supabase TypeScript types committed

## M1: Core screens

- [ ] Customers: list, search by name/phone, detail with balance
- [ ] Payments and credit: record payment, credit statement
- [ ] Reports: today / this week / this Ethiopian month; export CSV
- [ ] Offline queue for the main money action with sync status indicator

## M2: Galmee Clinic features

- [ ] Reception queue: today's patients with status (waiting, with doctor, lab, done)
- [ ] Patient card: history, visits, lab results, attachments
- [ ] Appointment calendar (core `bookings`, resource = doctor)
- [ ] Lab request and result entry
- [ ] Daily income by service
- [x] Migration: cl_patients
- [x] Migration: cl_visits
- [x] Migration: cl_services
- [x] Migration: cl_visit_services
- [x] Migration: cl_lab_orders
- [x] Migration: cl_lab_results
- [x] Migration: cl_attachments
- [x] `cl_open_visit`, `cl_add_service`, `cl_close_visit_and_bill` RPCs; billing via core `payments`/`credit_ledger`
- [x] Card number auto-generated per tenant
- [ ] Clinical notes visible to doctor role only; reception sees name/phone/queue; log every patient-card view

## M3: Notifications

- [ ] SMS appointment reminder the day before
- [ ] Telegram to doctor when a lab result is ready
- [ ] Edge Function reads `notifications` queue and sends (needs AfroMessage/Telegram keys: ask in the decision log)

## M4: Demo ready

- [ ] Demo tenant "Galmee Clinic Demo" with data: 30 fictional patients, 10 services (consultation, CBC, malaria test, etc.), a week of visits
- [ ] Demo login documented in the decision log for Alpha (password set by Alpha, never committed)
- [ ] 5-minute demo path works on a phone in airplane mode for the main action
- [ ] Amharic and Afaan Oromo text reviewed list in the decision log for Alpha (native speaker)

## M5: Client ready

- [ ] Receipt printing (58/80 mm thermal) and Telegram receipt
- [ ] Data import from Excel/CSV
- [ ] Export all tenant data to Excel
- [ ] Error monitoring hook (Sentry, DSN via env)
- [ ] README: setup, env vars, deploy steps

## Q: Quality and security baseline (do these inside M0 and M1, not after)

- [x] `docs/DESIGN.md` written per the frontend guidelines (palette, type with Ethiopic support, layout wireframes, reviewed against generic defaults)
- [ ] Tailwind theme tokens and `next/font` fonts from DESIGN.md
- [ ] `server-only` Data Access Layer in `src/server/dal/`; every Server Action validates with zod and re-checks auth + role
- [ ] Security headers and CSP with nonce (the security guidelines section 5)
- [ ] Cross-tenant RLS test extended to this product's tables and passing
- [ ] Playwright screenshot script for 360 px and 1280 px
- [ ] `npm audit` clean, Dependabot active
- [ ] Self-audit (the security guidelines section 9) recorded in the dev log
