# Credit System — Economy Design

## Overview

Aksara uses a **single-currency credit economy**. Credits are the only unit of exchange across all product actions: downloading a font, purchasing a subscription, buying add-ons, and receiving referral rewards.

This keeps the user experience simple — one wallet, one currency, one set of rules.

---

## Credit Value

```
10 credits = Rp 17,000 ≈ USD 1.00
1 credit   = Rp 1,700  ≈ USD 0.10
```

Exchange rates may be updated by the admin via the CMS (`site_content` key: `pricing.credit_rate_idr`). The credit value in the database is always stored as an integer count — currency conversion is a display concern only.

---

## Minimum Purchase

| Bundle | Credits | Price (IDR) | Price (USD) |
|---|---|---|---|
| Starter | 10 | Rp 17,000 | ~$1.00 |
| Standard | 50 | Rp 80,000 | ~$4.70 |
| Pro | 100 | Rp 150,000 | ~$8.80 |
| Studio | 200 | Rp 280,000 | ~$16.50 |

Larger bundles are cheaper per credit. This rewards users who commit, and reduces payment processing overhead.

Credits **do not expire**. They remain in the wallet until used.

---

## Pricing Tiers

### Free Tier
- No credit required
- Can draw all 62 characters
- Download limited to uppercase A–Z only (26 glyphs)
- Live preview works in full

### Pay-per-use Download
```
10 credits per font download (full 62-character set)
```
Equivalent to Rp 17,000 / ~$1.00 per font. Designed for casual users who make one or a few fonts and don't need a subscription.

**Important:** charging is per font *project*, not per click. A user who has already paid to unlock a project can re-download (e.g. after fixing a glyph) at no additional charge.

### Monthly Subscription
```
49 credits per month
→ Includes quota of 10 font downloads
```
Equivalent to Rp 83,300 / ~$4.90/month. This is 51% cheaper than buying 10 fonts at pay-per-use rates (which would cost 100 credits).

The 49-credit subscription is purchased from the user's credit wallet. This means the user must top up credits first, then "spend" those credits to activate a subscription.

### Add-on (Subscribers Only)
```
30 credits per add-on
→ Adds 10 downloads to the current month's quota
```
Available only to active subscribers. Designed for months when a user needs more than 10 fonts. Equivalent to 3 credits/font — the best per-font rate available.

Add-on quota is **not carried over** to the next month. It applies only to the current billing period.

### Monthly Quota Reset
Subscription quota resets to 10 at the start of each billing period. Unused downloads from the previous month are discarded. This is standard industry behavior and prevents quota hoarding.

---

## Credit Transactions — What Earns and What Costs

| Event | Credit Change |
|---|---|
| Buy 10-credit bundle | +10 |
| Buy 50-credit bundle | +50 |
| Buy 100-credit bundle | +100 |
| Buy 200-credit bundle | +200 |
| Activate subscription | −49 |
| Purchase add-on | −30 |
| Download (pay-per-use) | −10 |
| Referral reward — referrer | +5 |
| Referral reward — referee (welcome bonus) | +5 |

All credit changes are recorded in the `credit_transactions` append-only ledger. The current balance is stored as a cached column on `profiles.credits_balance` and updated atomically with each transaction.

---

## Subscription State Machine

```
[no subscription]
       │
       │  User spends 49 credits
       ▼
   [active]  ←──────────────────────────────────────────┐
       │                                                 │
       │  Monthly renewal (49 credits deducted again)   │
       │  Add-on purchased (30 credits, +10 quota)      │
       ▼                                                 │
   [active]  ──────── month resets quota to 10 ─────────┘
       │
       │  User doesn't have 49 credits at renewal
       ▼
  [past_due]  ─── user tops up → manually renew ──→ [active]
       │
       │  7 days pass with no renewal
       ▼
   [expired]
```

Already-unlocked fonts are **never revoked** on expiry. The subscription pays for the *act of unlocking*, not for ongoing access to previously downloaded work.

---

## Referral System

### Goal
Turn heavy users (who already get the best per-font rate via add-ons) into active growth channels. Their discounted usage is offset by the new users they bring in.

### Mechanics

```
1. User A shares their unique referral link/code with User B
2. User B signs up — no reward yet
3. User B completes their FIRST credit purchase
4. System triggers:
   - User A receives +5 credits
   - User B receives +5 credits (welcome bonus)
5. Both credited atomically in a single Postgres transaction
```

Delay to first purchase (not signup) prevents abuse via mass fake account creation.

### Referral Tiers

| Tier | Criteria | Reward |
|---|---|---|
| Standard | Any user with a referral | +5 credits per successful referral |
| Active (monthly) | 3+ referrals in a calendar month | +10 bonus credits that month |
| Ambassador (lifetime) | 10+ total successful referrals | Permanent add-on discount: 25 credits (vs 30) |

The Active tier bonus effectively gives the referrer a free add-on in months where they're actively promoting Aksara.

### Fraud Prevention

- One reward per referral pair (unique constraint on `referrer_id + referred_id`)
- Referral only triggers on real money changing hands (first purchase), not on signup
- Admin can flag and reverse suspicious referral chains via the audit log
- Referral credits **cannot be used to purchase subscriptions** — only for pay-per-use downloads. This protects recurring revenue from being bypassed by referral stacking.

### Referral Credit Restrictions

| Use case | Allowed with referral credits? |
|---|---|
| Pay-per-use font download | ✅ Yes |
| Add-on purchase (subscriber only) | ✅ Yes |
| Subscription activation | ❌ No — must use purchased credits |

This distinction ensures subscriptions always represent real monetary commitment.

---

## Economics Summary

| User type | Monthly spend | Monthly fonts | Cost per font |
|---|---|---|---|
| Casual (pay-per-use) | Rp 17,000 | 1 | Rp 17,000 |
| Subscriber | Rp 83,300 | 10 | Rp 8,330 |
| Subscriber + 1 add-on | Rp 134,300 | 20 | Rp 6,715 |
| Subscriber + 4 add-ons | Rp 287,300 | 50 | Rp 5,746 |
| Ambassador discount sub + 4 add-ons | Rp 278,300 | 50 | Rp 5,566 |

The subscriber heavy user at Rp 5,566/font is cheap — but if they're an Ambassador driving 10+ referrals, each new user (at minimum 10 credits bought) brings Rp 17,000+ in revenue. A referrer bringing 5 users/month generates Rp 85,000 in new GMV — more than covering the cost of their subsidized usage.
