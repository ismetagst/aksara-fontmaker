# Admin Panel Specification

## Access Control

All `/admin/*` routes are protected at two layers:

1. **Next.js middleware** — checks `profiles.role = 'admin'` server-side before rendering any admin page. Unauthenticated users are redirected to login. Authenticated non-admins get a 403.
2. **Supabase RLS** — admin-specific write policies on `site_content`. The `admin_audit_log` table is read/write only via the service role key in server actions.

Admin role is assigned manually via the Supabase dashboard or a migration. There is no self-service admin promotion.

---

## Dashboard `/admin`

**At-a-glance metrics (last 30 days):**

| Metric | Source |
|---|---|
| Total users | `count(profiles)` |
| Active subscribers | `count(subscriptions where status='active')` |
| Revenue (IDR) | `sum(orders.amount_idr where status='paid')` |
| Credits issued | `sum(credit_transactions.amount where amount > 0)` |
| Credits spent | `abs(sum(credit_transactions.amount where amount < 0))` |
| Successful referrals | `count(referral_events where status='completed')` |
| Fonts downloaded | `count(font_projects where status='unlocked')` |

Charts: revenue by day, new signups by day, credits issued vs spent.

---

## Users `/admin/users`

**List view:**
- Search by email or display name
- Filter by: plan (free / subscriber / expired), signup date range
- Columns: email, plan status, credit balance, total referrals, signup date, last active

**User detail `/admin/users/[id]`:**

Sections:
- **Profile** — email, display name, role, referral code, referred by (link to referrer's detail page)
- **Credit wallet** — current balance, full transaction history (paginated, filterable by type)
- **Subscription** — current status, period dates, quota used/limit, history of past subscriptions
- **Font projects** — list of all projects, status (draft/unlocked), download count
- **Orders** — all top-up orders, amounts, statuses
- **Referrals** — users they referred (link each), total credits earned from referrals

**Actions (all write to `admin_audit_log`):**
- Manual credit grant: input amount + reason → calls `add_credits` RPC
- Manual credit deduct: input amount + reason
- Force-expire subscription
- Change user role (user ↔ admin)
- Flag account (adds note visible in admin only)

---

## Orders `/admin/orders`

Full list of all `orders` records.

Filters: status (pending / paid / failed / refunded), date range, provider, product type.

Columns: order ID, user email, product, amount (IDR), credits granted, provider, status, created at, paid at.

Action: Mark as refunded (calls `deduct_credits` to reverse the credit award + logs to audit).

---

## Subscriptions `/admin/subscriptions`

Active and historical subscriptions.

Filters: status, period end date.

Columns: user email, status, period start/end, quota used/limit, add-ons purchased this period.

Action: Force-renew, force-expire, adjust quota.

---

## Referrals `/admin/referrals`

Overview of the referral system performance.

- Total referral events (completed)
- Total credits awarded via referral
- Top referrers (by total_referrals count)
- Recent referral events list

Action: Reverse a referral event (deducts credits from both parties, updates `referral_events.status = 'reversed'`, logs to audit).

---

## CMS `/admin/cms`

Form-based editor over the `site_content` table. Changes take effect immediately on the public site (no redeploy required).

Fields are grouped by section:

**Header**
- `header.eyebrow` — small label above headline
- `header.tagline` — main headline

**Pricing**
- `pricing.credit_rate_idr` — IDR price per 10 credits
- `pricing.subscription_credits` — cost of subscription in credits
- `pricing.subscription_quota` — fonts per subscription period
- `pricing.addon_credits` — cost of add-on in credits
- `pricing.addon_quota` — fonts per add-on
- `pricing.download_credits` — pay-per-use cost in credits

**Referral**
- `referral.reward_referrer` — credits awarded to referrer
- `referral.reward_referee` — welcome bonus credits

**Footer**
- `footer.note` — disclaimer text
- `footer.credit` — attribution line

Every save writes the editor's `profiles.id` to `site_content.updated_by` and timestamps `updated_at`. The last-editor information is shown in the form.

---

## Audit Log `/admin/audit`

Paginated, read-only view of `admin_audit_log`.

Filters: admin (who performed the action), action type, date range.

Columns: timestamp, admin email, action, target (table + ID), details (expandable JSON).

No actions available — audit log is immutable.

---

## Admin API Routes (server actions / route handlers)

All admin operations are server actions or route handlers that:
1. Verify `session.user.id` has `role = 'admin'` via a direct DB check (not just middleware, defense in depth)
2. Use the Supabase service role key for writes
3. Insert a row into `admin_audit_log` before returning

```
POST /api/admin/credits/grant      { user_id, amount, reason }
POST /api/admin/credits/deduct     { user_id, amount, reason }
POST /api/admin/subscription/expire { subscription_id, reason }
POST /api/admin/subscription/adjust-quota { subscription_id, new_limit, reason }
POST /api/admin/referral/reverse   { referral_event_id, reason }
POST /api/admin/cms/update         { key, value }
GET  /api/admin/users              ?search=&plan=&page=
GET  /api/admin/users/[id]
GET  /api/admin/orders             ?status=&from=&to=
GET  /api/admin/subscriptions      ?status=
GET  /api/admin/referrals
GET  /api/admin/audit              ?admin_id=&action=&from=&to=
```
