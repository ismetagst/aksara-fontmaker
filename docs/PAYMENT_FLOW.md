# Payment Flow

## Overview

All monetary transactions flow through a payment provider (Midtrans or Xendit) via server-side webhook. The client never directly modifies credit balances or payment state — only the webhook handler, running with the Supabase service role key, writes payment records.

```
Client                  Next.js Server          Payment Provider
  │                          │                        │
  │  POST /api/checkout       │                        │
  ├─────────────────────────►│                        │
  │                          │  Create order in DB    │
  │                          │  POST /payment/create  │
  │                          ├───────────────────────►│
  │                          │  { payment_url }       │
  │                          │◄───────────────────────┤
  │  { payment_url }         │                        │
  │◄─────────────────────────┤                        │
  │                          │                        │
  │  User pays on provider   │                        │
  │─────────────────────────────────────────────────►│
  │                          │                        │
  │                          │  POST /api/webhooks/   │
  │                          │◄───────────────────────┤
  │                          │  Verify signature      │
  │                          │  Update order status   │
  │                          │  Award credits         │
  │                          │  Trigger referral?     │
```

---

## Products and Pricing

| Product | Credits deducted from wallet | Credits added to wallet | IDR price |
|---|---|---|---|
| 10-credit bundle | — | +10 | Rp 17,000 |
| 50-credit bundle | — | +50 | Rp 80,000 |
| 100-credit bundle | — | +100 | Rp 150,000 |
| 200-credit bundle | — | +200 | Rp 280,000 |
| Subscription (monthly) | −49 from wallet | — | paid via wallet |
| Add-on (+10 quota) | −30 from wallet | — | paid via wallet |
| Pay-per-use download | −10 from wallet | — | paid via wallet |

**Credit top-ups** are paid with real money via the payment provider.
**Subscription, add-on, and downloads** are paid from the credit wallet (no direct payment provider involvement for these — they are pure wallet deductions).

This means payment provider integration is only needed for credit top-ups. Everything else is an internal credit deduction.

---

## Checkout Flow (Credit Top-up)

### 1. Client initiates checkout

```typescript
// POST /api/checkout
// Body: { bundle: '10' | '50' | '100' | '200' }

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { bundle } = await req.json();
  const bundleConfig = BUNDLES[bundle]; // { credits: 10, amount_idr: 17000 }
  if (!bundleConfig) return Response.json({ error: 'Invalid bundle' }, { status: 400 });

  // Create order in DB (status: 'pending')
  const order = await supabaseAdmin
    .from('orders')
    .insert({
      user_id: session.user.id,
      product_type: 'credit_topup',
      credits_granted: bundleConfig.credits,
      amount_idr: bundleConfig.amount_idr,
      provider: 'midtrans',
      provider_order_id: `AKSARA-${session.user.id.slice(0,8)}-${Date.now()}`,
    })
    .select().single();

  // Call payment provider
  const paymentUrl = await createMidtransTransaction({
    order_id: order.data.provider_order_id,
    gross_amount: bundleConfig.amount_idr,
    customer: { email: session.user.email },
  });

  return Response.json({ payment_url: paymentUrl });
}
```

### 2. User completes payment on provider page

Provider handles all payment UX (bank transfer, QRIS, virtual account, credit card). Aksara does not touch payment credentials.

### 3. Webhook receives confirmation

```typescript
// POST /api/webhooks/midtrans

export async function POST(req: Request) {
  const body = await req.json();

  // Verify signature (Midtrans: SHA512 of order_id + status_code + gross_amount + server_key)
  const isValid = verifyMidtransSignature(body);
  if (!isValid) return Response.json({ error: 'Invalid signature' }, { status: 403 });

  if (body.transaction_status !== 'settlement') {
    // Handle pending, expired, cancel — update order status only
    await supabaseAdmin
      .from('orders')
      .update({ status: mapStatus(body.transaction_status) })
      .eq('provider_order_id', body.order_id);
    return Response.json({ ok: true });
  }

  // === Payment confirmed ===

  // 1. Fetch the order
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('*, profiles!inner(referred_by)')
    .eq('provider_order_id', body.order_id)
    .eq('status', 'pending')  // idempotency guard
    .single();

  if (!order) return Response.json({ ok: true }); // already processed

  // 2. Mark order as paid
  await supabaseAdmin
    .from('orders')
    .update({ status: 'paid', paid_at: new Date().toISOString(), provider_ref: body.transaction_id })
    .eq('id', order.id);

  // 3. Award credits to user wallet
  await supabaseAdmin.rpc('add_credits', {
    p_user_id: order.user_id,
    p_amount: order.credits_granted,
    p_type: 'topup',
    p_reference_id: order.id,
  });

  // 4. Check if this is the user's FIRST purchase → trigger referral
  const { count: previousPaidOrders } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact' })
    .eq('user_id', order.user_id)
    .eq('status', 'paid')
    .neq('id', order.id); // exclude current order

  if (previousPaidOrders === 0 && order.profiles?.referred_by) {
    // First purchase + user was referred → award referral credits
    await supabaseAdmin.rpc('award_referral', {
      p_referrer_id: order.profiles.referred_by,
      p_referred_id: order.user_id,
      p_order_id: order.id,
    });
  }

  return Response.json({ ok: true });
}
```

### Idempotency

The webhook may be delivered more than once. The guard `eq('status', 'pending')` ensures credits are only awarded once per order. If the order is already `paid`, the query returns null and the handler returns early.

---

## Wallet Deductions (No Payment Provider)

Subscription purchase, add-on, and pay-per-use downloads are all deducted from the credit wallet without hitting the payment provider:

```typescript
// POST /api/download/[projectId]

export async function POST(req: Request, { params }) {
  const session = await getServerSession();
  const project = await getProject(params.projectId, session.user.id);

  if (project.status === 'unlocked') {
    // Already paid — re-download for free
    return serveFont(project);
  }

  // Check subscription first
  const sub = await getActiveSubscription(session.user.id);
  if (sub && sub.unlocks_used < sub.unlocks_limit) {
    await supabaseAdmin
      .from('subscriptions')
      .update({ unlocks_used: sub.unlocks_used + 1 })
      .eq('id', sub.id);

    await markProjectUnlocked(project.id, 'subscription');
    return serveFont(project);
  }

  // Fall back to pay-per-use
  await supabaseAdmin.rpc('deduct_credits', {
    p_user_id: session.user.id,
    p_amount: 10,
    p_type: 'download',
    p_reference_table: 'font_projects',
    p_reference_id: project.id,
  });
  // deduct_credits raises an exception if balance insufficient — caught as 402

  await markProjectUnlocked(project.id, 'one_time');
  return serveFont(project);
}
```

---

## Midtrans vs Xendit

Both providers support the required features. Recommendation: **Xendit** for greenfield projects.

| Feature | Midtrans | Xendit |
|---|---|---|
| Virtual Account | ✅ | ✅ |
| QRIS | ✅ | ✅ |
| Credit Card | ✅ | ✅ |
| GoPay / OVO | ✅ | ✅ |
| Webhook reliability | Good | Excellent |
| Dashboard UX | Adequate | Modern |
| Sandbox quality | Good | Excellent |
| Recurring/subscription API | ✅ | ✅ |

Since subscriptions in Aksara are paid via credit wallet (not recurring billing), the recurring payment API is not required at this stage. The payment provider only handles one-time credit top-ups.

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # Server-side only, never exposed to client

# Midtrans
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false       # true in production

# Xendit (if using Xendit instead)
XENDIT_SECRET_KEY=
XENDIT_WEBHOOK_TOKEN=

# App
NEXT_PUBLIC_APP_URL=https://aksara.app
```
