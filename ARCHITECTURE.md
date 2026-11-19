# Aksara — System Architecture

## Overview

The current implementation is a standalone browser editor in `index.html`, with inline HTML/CSS/JavaScript and no build step. It uses opentype.js from cdnjs for live font preview and export. Glyphs, reference settings, and history live in browser memory; there is no persistence or server API in this checkout.

The planned commercial product uses Next.js backed by Supabase (PostgreSQL + Auth + Storage), with a credit-based payment layer integrated via Midtrans or Xendit. The commerce map, application layers, and security model below describe that target architecture.

The future commercialization layer will wrap the drawing engine in an authenticated app, persist projects, gate downloads behind credit deduction, and add an admin panel. The current editor exports the full 62-character set without authentication or a payment gate.

## Current Editor Architecture

- **Presentation:** responsive neutral panels and blue–violet controls, with an artboard, external rulers, character grid, a vertical tool rail, contextual inspector panels, layers, and live type tester. Tools share the canvas row, and character navigation lives in the artboard chrome without a separate editor heading. Manual Focus mode hides the project header, retains a logo/restore control and export icon in the rail, and stores only the view preference under `aksara:focus-mode`. Both export controls share one font-building handler; glyph/project state remains in memory.
- **Rendering:** three stacked canvases for guides, the reference image, and ink. Grid and Guides toggle only the guide canvas; they do not change outlines or exports.
- **Coordinates:** 1000 units/em; ascender 800, descender −200, cap height 700, x-height 500, baseline 0. Canvas coordinates use `x × emScale` and `(800 − y) × emScale`. Rulers are DOM elements outside the drawing surface. Zoom resizes the artboard in a scrollable viewport and recomputes `emScale`; pointer positions use the current canvas bounding rectangle, including scroll. View operations do not transform glyph data. Each display canvas backing buffer is capped at 2560 px per side independently of export resolution.
- **Glyphs:** 62 characters (`0–9`, `A–Z`, `a–z`), each with marks, advance width, and reference-placement settings. A reference image is shared while placement is tracked per glyph. Advance widths are clamped to 150–900 units in steps of 10.
- **Bézier anchors:** absolute `x`/`y` positions plus relative `handleIn`/`handleOut` vectors. Optional `handleMode` records smooth, symmetric, independent, or corner behavior; legacy anchors infer continuity from their vectors. Incoming/outgoing refer to path direction.
- **History:** per-glyph snapshots copy marks and optional unfinished paths. Anchor edits retain handle modes; open-path edits preserve before/after snapshots for undo.
- **Export:** marching-squares contour tracing and winding correction feed opentype.js CFF/OTF generation. FontFace supplies the live preview; the preview size control affects display only.
- **Validation:** `npm --prefix tests ci && npm --prefix tests test` runs geometry checks and integration workflows using jsdom, native Canvas rendering, and the same opentype.js version as the browser editor. Test dependencies live under `tests/` so the root remains a buildless static app. Browser layout, native FontFace/download UI, and touch/stylus interactions require separate manual verification. See [docs/TESTING.md](docs/TESTING.md).

See [docs/EDITOR_GUIDE.md](docs/EDITOR_GUIDE.md) for the user workflow.

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

### 1. Drawing Engine (current: `index.html`)

Buildless HTML/JS/CSS with opentype.js loaded externally. Planned migration into a Next.js route at `/editor/[projectId]`:
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
| Font rendering | opentype.js v0.6.5 | Current editor dependency; produces CFF OTF |
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
Phase 1  Auth + editor persistence + credit wallet + payments + download gates
Phase 2  Admin operations + CMS + email notifications
Phase 3  Subscription + add-on + referral engine
Phase 4  Automation + scale
```
