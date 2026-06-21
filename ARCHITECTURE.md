# Aksara — System Architecture

## Overview

Aksara as a commercial product is a Next.js web application backed by Supabase (PostgreSQL + Auth + Storage), with a credit-based payment layer integrated via Midtrans or Xendit.

The current `aksara-font-maker.html` is the complete, self-contained drawing engine. The commercialization layer wraps it in an authenticated Next.js app, gates the download behind credit deduction, and adds an admin panel.

---

## System Map

```
┌─────────────────────────────────────────────────────────┐
│                  Public Web App (Next.js)                │
│                                                         │
│   /                Landing + pricing page               │
│   /editor/[id]     The Aksara drawing tool              │
│   /dashboard       User's saved font projects           │
│   /admin/*         Admin panel (role-gated)             │
└────────────────┬────────────────────────────────────────┘
                 │
     ┌───────────┼───────────────┐
     │           │               │
┌────▼────┐ ┌────▼────┐  ┌───────▼──────┐
│Supabase │ │Supabase │  │   Supabase   │
│  Auth   │ │Postgres │  │   Storage    │
│(sessions│ │(RLS     │  │(glyph JSON   │
│+ JWTs)  │ │ enabled)│  │ optional)    │
└─────────┘ └────┬────┘  └──────────────┘
                 │
     ┌───────────▼──────────────┐
     │    Payment Webhooks       │
     │  Midtrans / Xendit        │
     │  - one-time credit top-up │
     │  - subscription purchase  │
     │  - add-on purchase        │
     └───────────┬──────────────┘
                 │
     ┌───────────▼──────────────┐
     │  Referral Engine          │
     │  (triggered on first      │
     │   successful purchase)    │
     └──────────────────────────┘
```

---

## Application Layers

### 1. Drawing Engine (current: `aksara-font-maker.html`)

Self-contained, zero-dependency HTML/JS/CSS. Ported into a Next.js route at `/editor/[projectId]` with minimal changes:
- Glyph data serialized to JSON and saved to Supabase on change (debounced, ~2s)
- Download button gated: checks credit balance / subscription quota before exporting `.otf`
- Free tier: download limited to uppercase A–Z only

### 2. Auth Layer (Supabase Auth)

- Email + password, or Google OAuth
- Session managed via Supabase SSR helpers in Next.js App Router
- `profiles.role` determines access to `/admin/*`
- All DB operations run with RLS — users can only read/write their own data

### 3. Data Layer (Supabase PostgreSQL)

See [`docs/DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md) for full table definitions.

Core tables:
- `profiles` — user accounts, credit balance, referral tracking
- `font_projects` — saved glyph data per user
- `credit_transactions` — append-only credit ledger
- `subscriptions` — active plan state and monthly quota
- `referral_events` — tracks referral completions and rewards
- `site_content` — CMS key-value for editable copy
- `admin_audit_log` — accountability for all manual admin actions

### 4. Payment Layer (Midtrans / Xendit)

See [`docs/PAYMENT_FLOW.md`](./docs/PAYMENT_FLOW.md).

Three purchasable products:
1. **Credit top-up** — one-time, adds to `profiles.credits_balance`
2. **Subscription** — monthly, deducts 49 credit from wallet, creates/renews subscription
3. **Add-on** — deducts 30 credit, adds 10 to `subscriptions.unlocks_limit` for current period

All payment state is written **only** by the webhook handler running with the Supabase service role key — never by client-side code.

### 5. Referral Engine

Triggered automatically by the payment webhook on a user's first successful credit purchase:
- Credits awarded to both referrer and referee atomically (Postgres transaction)
- No manual admin involvement required
- Fraud prevention: referral only triggers on actual money moving, not on signup

### 6. Admin Panel (`/admin/*`)

Role-gated by Next.js middleware + Supabase RLS. Capabilities:
- User management (search, view balance, manual credit grant/revoke)
- Transaction history and reconciliation
- Subscription status overview
- CMS editor (site_content key-value pairs)
- Audit log viewer

See [`docs/ADMIN_PANEL.md`](./docs/ADMIN_PANEL.md).

---

## Technology Choices

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 App Router | SSR for auth, easy Supabase integration |
| Database | Supabase PostgreSQL | Built-in auth, RLS, real-time, Storage |
| Styling | Tailwind CSS | Same design tokens as drawing tool |
| Payment | Midtrans or Xendit | Indonesia-first, supports virtual account + QRIS |
| Font rendering | opentype.js v0.6.5 | Only version on cdnjs; produces valid CFF OTF |
| Hosting | Vercel | Zero-config Next.js deployment |
| DNS / CDN | Cloudflare | Free tier covers current scale |

---

## Security Model

- **RLS on all tables**: users read/write only their own rows
- **Payment state immutable from client**: only webhook handler (service role) writes payment records
- **Admin routes**: checked server-side in middleware — no client-only access control
- **Credit deduction**: atomic Postgres function with `FOR UPDATE` lock — prevents double-spend race conditions
- **Referral fraud**: delayed trigger (first purchase only), one award per referral pair (unique constraint)

---

## Build Sequence

See [`docs/ROADMAP.md`](./docs/ROADMAP.md) for the full phased plan.

```
Phase 1  Auth + editor + glyph persistence + free-tier download gate
Phase 2  Credit system + payment webhook + one-time download purchase
Phase 3  Subscription + add-on + referral engine + admin panel + CMS
```
