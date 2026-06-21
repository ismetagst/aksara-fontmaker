# Database Schema

All tables live in PostgreSQL via Supabase. Row Level Security (RLS) is enabled on all tables. The Supabase service role key is used only by server-side webhook handlers — never exposed to the client.

---

## `profiles`
One row per user. Mirrors `auth.users.id`.

```sql
create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null,
  display_name      text,
  role              text not null default 'user' check (role in ('user', 'admin')),

  -- Credit wallet
  credits_balance   integer not null default 0 check (credits_balance >= 0),

  -- Referral
  referral_code     text unique not null,        -- auto-generated on signup (e.g. "AKSARA-ABC12")
  referred_by       uuid references profiles(id),
  total_referrals   integer not null default 0,  -- lifetime successful referrals

  created_at        timestamptz not null default now()
);

-- RLS: users read/write their own row only
alter table profiles enable row level security;
create policy "own profile" on profiles
  using (auth.uid() = id);
```

---

## `font_projects`
One row per font project a user is building.

```sql
create table font_projects (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  name            text not null default 'Untitled Font',

  -- Glyph data: the full JSON state of the drawing engine per character
  glyph_data      jsonb not null default '{}',

  -- Unlock state
  status          text not null default 'draft'
                    check (status in ('draft', 'unlocked')),
  unlock_source   text check (unlock_source in ('one_time', 'subscription', 'free_tier', null)),
  unlocked_at     timestamptz,

  -- Metadata
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_downloaded_at timestamptz
);

-- RLS
alter table font_projects enable row level security;
create policy "own projects" on font_projects
  using (auth.uid() = user_id);

-- Auto-update updated_at
create trigger font_projects_updated_at
  before update on font_projects
  for each row execute function moddatetime(updated_at);
```

**Notes:**
- `glyph_data` stores the full `glyphs` object from the drawing engine as JSONB
- `status = 'draft'` → free-tier download (uppercase only)
- `status = 'unlocked'` → full 62-character download permitted

---

## `credit_transactions`
Append-only ledger. Never updated, only inserted. Source of truth for credit balance.

```sql
create table credit_transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,

  -- Amount: positive = credit earned, negative = credit spent
  amount          integer not null,

  -- Why this transaction happened
  type            text not null check (type in (
                    'topup',           -- user bought credit bundle
                    'subscription',    -- user activated subscription (-49)
                    'addon',           -- user bought add-on (-30)
                    'download',        -- pay-per-use download (-10)
                    'referral_reward', -- referral credit (+5)
                    'welcome_bonus',   -- first-purchase welcome bonus (+5)
                    'manual_grant',    -- admin manual adjustment
                    'refund'           -- refund credited back
                  )),

  -- Reference to the payment or event that triggered this
  reference_table text,   -- e.g. 'orders', 'subscriptions', 'referral_events'
  reference_id    uuid,

  -- Running balance snapshot at time of transaction (for audit)
  balance_after   integer not null,

  -- Who performed it (for manual grants)
  performed_by    uuid references profiles(id),

  created_at      timestamptz not null default now()
);

-- RLS: users can read their own transactions; no user can insert (service role only)
alter table credit_transactions enable row level security;
create policy "read own transactions" on credit_transactions
  for select using (auth.uid() = user_id);
```

---

## `subscriptions`

```sql
create table subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references profiles(id) on delete cascade,

  status                    text not null default 'active'
                              check (status in ('active', 'past_due', 'expired', 'canceled')),

  -- Billing period
  current_period_start      timestamptz not null,
  current_period_end        timestamptz not null,

  -- Monthly download quota (base 10, increased by add-ons)
  unlocks_limit             integer not null default 10,
  unlocks_used              integer not null default 0,

  -- Payment reference
  provider                  text,   -- 'midtrans' | 'xendit'
  provider_subscription_id  text,

  created_at                timestamptz not null default now(),
  canceled_at               timestamptz,
  expired_at                timestamptz
);

-- Only one active subscription per user
create unique index one_active_sub_per_user
  on subscriptions (user_id)
  where status = 'active';

-- RLS
alter table subscriptions enable row level security;
create policy "own subscription" on subscriptions
  using (auth.uid() = user_id);
```

**How add-ons work:** When a subscriber purchases an add-on, the webhook increments `unlocks_limit` by 10. At period reset, `unlocks_limit` returns to base 10 and `unlocks_used` resets to 0. Add-on quota does not carry over.

---

## `orders`
One-time payment records (credit bundles).

```sql
create table orders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,

  -- What was purchased
  product_type    text not null check (product_type in (
                    'credit_topup',
                    'subscription',
                    'addon'
                  )),
  credits_granted integer not null,  -- how many credits this order adds

  -- Payment details
  amount_idr      integer not null,  -- amount in Rupiah (e.g. 17000)
  provider        text not null,     -- 'midtrans' | 'xendit'
  provider_ref    text,              -- external transaction ID
  provider_order_id text,            -- our order ID sent to provider

  status          text not null default 'pending'
                    check (status in ('pending', 'paid', 'failed', 'refunded')),

  created_at      timestamptz not null default now(),
  paid_at         timestamptz,
  failed_at       timestamptz
);

-- RLS: users read their own orders only
alter table orders enable row level security;
create policy "own orders" on orders
  for select using (auth.uid() = user_id);
```

---

## `referral_events`

```sql
create table referral_events (
  id              uuid primary key default gen_random_uuid(),
  referrer_id     uuid not null references profiles(id),
  referred_id     uuid not null references profiles(id),

  -- Triggered by the referred user's first paid order
  triggering_order_id uuid references orders(id),

  credits_to_referrer integer not null default 5,
  credits_to_referred integer not null default 5,

  status          text not null default 'completed'
                    check (status in ('pending', 'completed', 'reversed')),

  created_at      timestamptz not null default now()
);

-- Prevent duplicate rewards for the same referral pair
create unique index one_referral_per_pair
  on referral_events (referrer_id, referred_id);

-- No RLS needed: only service role reads/writes this table
```

---

## `site_content`
Key-value CMS. Admin-editable copy shown on the public site.

```sql
create table site_content (
  key             text primary key,
  value           text not null,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references profiles(id)
);

-- RLS: public can read; only admins can write
alter table site_content enable row level security;
create policy "public read" on site_content
  for select using (true);
create policy "admin write" on site_content
  for all using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );
```

**Initial keys:**

| Key | Description |
|---|---|
| `header.eyebrow` | Small label above the headline |
| `header.tagline` | Main headline text |
| `pricing.credit_rate_idr` | Price per 10 credits in Rupiah |
| `pricing.subscription_credits` | Credit cost of subscription (default: 49) |
| `pricing.subscription_quota` | Downloads per subscription period (default: 10) |
| `pricing.addon_credits` | Credit cost of add-on (default: 30, ambassador: 25) |
| `pricing.addon_quota` | Downloads per add-on (default: 10) |
| `pricing.download_credits` | Credits per pay-per-use download (default: 10) |
| `referral.reward_referrer` | Credits awarded to referrer (default: 5) |
| `referral.reward_referee` | Credits awarded to referee (default: 5) |
| `footer.note` | Footer disclaimer text |
| `footer.credit` | "Crafted by ..." attribution |

---

## `admin_audit_log`
Accountability record for all manual admin actions.

```sql
create table admin_audit_log (
  id              uuid primary key default gen_random_uuid(),
  admin_id        uuid not null references profiles(id),
  action          text not null,    -- e.g. 'manual_credit_grant', 'subscription_force_expire'
  target_table    text,
  target_id       uuid,
  details         jsonb,            -- before/after state or relevant context
  created_at      timestamptz not null default now()
);

-- No user-facing RLS; admins read via service role in admin panel
```

---

## Key Database Functions

### `deduct_credits(user_id, amount, type, reference_table, reference_id)`
Atomically deducts credits and inserts a transaction record. Uses `SELECT FOR UPDATE` on the profiles row to prevent race conditions.

```sql
create or replace function deduct_credits(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_reference_table text default null,
  p_reference_id uuid default null
) returns void language plpgsql security definer as $$
declare
  v_balance integer;
begin
  -- Lock the row
  select credits_balance into v_balance
  from profiles where id = p_user_id for update;

  if v_balance < p_amount then
    raise exception 'Insufficient credits: have %, need %', v_balance, p_amount;
  end if;

  -- Deduct
  update profiles
  set credits_balance = credits_balance - p_amount
  where id = p_user_id;

  -- Log
  insert into credit_transactions
    (user_id, amount, type, reference_table, reference_id, balance_after)
  values
    (p_user_id, -p_amount, p_type, p_reference_table, p_reference_id, v_balance - p_amount);
end;
$$;
```

### `award_referral(referrer_id, referred_id, order_id)`
Called by the webhook when a user completes their first purchase. Awards credits to both parties atomically.

```sql
create or replace function award_referral(
  p_referrer_id uuid,
  p_referred_id uuid,
  p_order_id uuid
) returns void language plpgsql security definer as $$
declare
  v_reward_referrer integer;
  v_reward_referred integer;
begin
  -- Read reward amounts from CMS (default 5 each)
  select coalesce(cast(value as integer), 5)
  into v_reward_referrer
  from site_content where key = 'referral.reward_referrer';

  select coalesce(cast(value as integer), 5)
  into v_reward_referred
  from site_content where key = 'referral.reward_referee';

  -- Create the referral event (unique constraint prevents double-award)
  insert into referral_events
    (referrer_id, referred_id, triggering_order_id, credits_to_referrer, credits_to_referred)
  values
    (p_referrer_id, p_referred_id, p_order_id, v_reward_referrer, v_reward_referred);

  -- Award to referrer
  update profiles
  set credits_balance = credits_balance + v_reward_referrer,
      total_referrals = total_referrals + 1
  where id = p_referrer_id;

  insert into credit_transactions
    (user_id, amount, type, reference_table, reference_id, balance_after)
  select p_referrer_id, v_reward_referrer, 'referral_reward',
         'referral_events', (select id from referral_events where referrer_id = p_referrer_id and referred_id = p_referred_id),
         credits_balance
  from profiles where id = p_referrer_id;

  -- Award to referee
  update profiles
  set credits_balance = credits_balance + v_reward_referred
  where id = p_referred_id;

  insert into credit_transactions
    (user_id, amount, type, reference_table, reference_id, balance_after)
  select p_referred_id, v_reward_referred, 'welcome_bonus',
         'referral_events', (select id from referral_events where referrer_id = p_referrer_id and referred_id = p_referred_id),
         credits_balance
  from profiles where id = p_referred_id;
end;
$$;
```
