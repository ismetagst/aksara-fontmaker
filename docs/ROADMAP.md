# Build Roadmap

The standalone drawing editor (`index.html`) is available now. The commerce phases below are planned and have not been implemented in this checkout. Each phase is intended to ship independently.

## Available Now — Standalone Editor

- [x] Pen, freehand, move/resize, and direct anchor editing
- [x] Corner, Smooth, Symmetric, and Independent anchor controls
- [x] Numeric anchor coordinates and incoming/outgoing handle offsets
- [x] Alt/Option handle separation, Alt-drag anchor conversion, and Shift angle constraints
- [x] Per-glyph undo/redo and unfinished-path editing
- [x] Reference image upload, placement, visibility, lock, and opacity controls
- [x] Responsive studio redesign with blue–violet accents and neutral panels
- [x] Artboard rulers, guide labels, advance-width boundary, and Grid/Guides toggles
- [x] Fit-to-viewport canvas, 100–400% zoom, hand/Space/middle-mouse panning, and nearest-point selection
- [x] Live type tester with size control, drawing progress, and OTF download
- [x] Resenarasi Instagram footer link with bold hover styling
- [x] Vertical tool rail with contextual glyph/reference inspector controls
- [x] Manual, remembered Focus mode with collapsed header, compact branding, artboard navigation, and accessible export
- [x] Node.js geometry checks and full-editor integration workflows through Canvas rendering and OTF parsing

Browser memory is the current storage model. Saving projects across reloads belongs to Phase 1. Automated geometry tests do not establish full browser compatibility; visual and pointer testing remain separate validation tasks.

---

## Phase 1 — Core Revenue Path

**Goal:** Users can sign up, save font projects, and pay to download a full font. No subscription yet — just the simplest possible money-in flow.

**What ships:**

- [ ] Next.js 14 project scaffold with Supabase SSR auth (email + Google OAuth)
- [ ] `/editor/[projectId]` — drawing engine ported in, glyph data auto-saved to Supabase (debounced)
- [ ] `/dashboard` — user's saved font projects, create new, rename, delete
- [ ] Free-tier download gate (uppercase A–Z only, no credit required)
- [ ] Credit wallet UI (balance shown in header)
- [ ] Credit top-up flow: bundle selection → Midtrans/Xendit checkout → webhook → credits awarded
- [ ] Pay-per-use download (10 credits, full 62-character set)
- [ ] Idempotent webhook handler with order status tracking
- [ ] Basic user profile page (referral code displayed, not yet functional)
- [ ] Supabase RLS on all tables
- [ ] `profiles`, `font_projects`, `orders`, `credit_transactions` tables deployed

**Does not include:** Subscription, add-ons, referral rewards, admin panel, CMS.

**Definition of done:** A real user can sign up, draw a font, buy 10 credits, and download a working `.otf` file.

---

## Phase 2 — Admin and Operability

**Goal:** The business can operate without manual intervention in Slack/WhatsApp. Admin panel allows support for stuck payments, manual credit grants, and basic reporting.

**What ships:**

- [ ] Admin panel scaffold at `/admin/*` with middleware role-gate
- [ ] `/admin/users` — search, view, manual credit grant/deduct
- [ ] `/admin/orders` — all orders, mark refunded
- [ ] `/admin/audit` — read-only audit log of all admin actions
- [ ] CMS at `/admin/cms` — editable `site_content` key-value pairs
- [ ] Public site reads CMS keys for pricing display and footer text
- [ ] Email notifications: purchase confirmation, low-credit warning (Resend or Supabase email)
- [ ] `site_content`, `admin_audit_log` tables deployed

**Definition of done:** An admin can fully support a user (grant credits, investigate a payment) without touching the database directly. The site can launch publicly.

---

## Phase 3 — Subscription, Add-on, and Referral

**Goal:** Unlock recurring revenue and word-of-mouth growth.

**What ships:**

- [ ] Subscription purchase flow (49 credits from wallet → creates subscription record)
- [ ] Monthly quota tracking (unlocks_used vs unlocks_limit)
- [ ] Download logic: check subscription quota first, fall back to pay-per-use
- [ ] Add-on purchase (30 credits → +10 to current period quota)
- [ ] Subscription renewal: manual re-purchase flow (user buys next month's plan; auto-renewal deferred to Phase 4)
- [ ] Referral system: referral code sharing, first-purchase trigger, atomic credit awards
- [ ] `award_referral` Postgres function deployed and tested
- [ ] Referral tiers tracked in `profiles.total_referrals`
- [ ] Ambassador discount (add-on at 25 credits when `total_referrals >= 10`)
- [ ] `/admin/subscriptions` — overview, force-expire, quota adjustment
- [ ] `/admin/referrals` — overview, top referrers, reverse events
- [ ] `subscriptions`, `referral_events` tables deployed

**Definition of done:** The full credit economy is live. Users can subscribe, use add-ons, refer friends, and receive credit rewards automatically.

---

## Phase 4 — Automation and Scale (Future)

Items deferred from earlier phases to keep scope manageable:

- [ ] Automatic subscription renewal via provider recurring billing (Xendit subscription API)
- [ ] Failed payment dunning — retry logic, past_due → expired flow
- [ ] Email sequences: renewal reminder (3 days before), expiry notice, win-back
- [ ] Analytics dashboard in admin (revenue trends, cohort retention, referral funnel)
- [ ] Webhook retry handling and dead-letter queue
- [ ] Font project versioning / history
- [ ] Multi-language support (English + Bahasa Indonesia)
- [ ] Public font showcase / gallery (opt-in)
- [ ] API access tier for studios (bulk font generation)

---

## Tech Stack (Commerce Layer)

| Concern | Choice |
|---|---|
| Framework | Next.js 14 App Router |
| Auth | Supabase Auth (email + Google OAuth) |
| Database | Supabase PostgreSQL (with RLS) |
| ORM | Supabase JS client + raw SQL for complex queries |
| Styling | Tailwind CSS (same tokens as drawing tool) |
| Payment | Xendit (preferred) or Midtrans |
| Email | Resend |
| Deployment | Vercel |
| DNS/CDN | Cloudflare |
| Repository | GitHub (this repo) |
| CI/CD | GitHub Actions → Vercel deploy on push to `main` |

---

## Planned Repository Conventions

```
src/
  app/
    (public)/       # Public routes: /, /pricing, /login, /signup
    (app)/          # Auth-required routes: /dashboard, /editor/[id]
    admin/          # Admin panel: /admin, /admin/users, etc.
    api/            # Route handlers: /api/checkout, /api/webhooks/[provider]
  components/       # Shared UI components
  lib/
    supabase/       # Client, server, admin helpers
    payment/        # Midtrans/Xendit integration
    credits/        # Credit deduction, balance check helpers
  types/            # Database type definitions (generated from Supabase)
```

In the planned commerce application, database migrations will live in `supabase/migrations/` and are applied via the Supabase CLI (`supabase db push`).
