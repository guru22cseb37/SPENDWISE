-- SpendWise initial schema. All monetary values are stored as integer minor units.
-- User-owned data is protected by row-level security.

create table if not exists public.users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  currency text not null default 'INR',
  locale text not null default 'en-IN',
  opening_balance_minor bigint not null default 0,
  theme text not null default 'dark' check (theme in ('dark', 'light', 'system')),
  onboarding_complete boolean not null default false,
  ai_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'CircleDollarSign',
  color text not null default '#6366f1',
  type text not null check (type in ('expense', 'income')),
  budget_minor bigint,
  is_archived boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists categories_system_name_type_uidx
  on public.categories (name, type) where user_id is null;
create unique index if not exists categories_user_name_type_uidx
  on public.categories (user_id, name, type) where user_id is not null;

create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_minor bigint not null check (amount_minor > 0),
  type text not null check (type in ('expense', 'income', 'transfer')),
  category_id uuid references public.categories(id) on delete set null,
  merchant text not null default '',
  description text not null default '',
  payment_method text not null default 'cash',
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  start_date date not null,
  end_date date,
  next_due_date date not null,
  is_active boolean not null default true,
  last_generated_date date,
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_minor bigint not null check (amount_minor > 0),
  type text not null check (type in ('expense', 'income', 'transfer')),
  category_id uuid references public.categories(id) on delete set null,
  date date not null,
  time time not null default localtime,
  merchant text not null default '',
  description text not null default '',
  payment_method text not null default 'cash',
  tags text[] not null default '{}',
  notes text,
  receipt_url text,
  is_recurring boolean not null default false,
  recurring_id uuid references public.recurring_transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null default 'monthly' check (period in ('weekly', 'monthly', 'custom')),
  total_minor bigint not null check (total_minor > 0),
  start_date date not null,
  end_date date,
  warn_threshold_pct numeric not null default 70,
  alert_threshold_pct numeric not null default 90,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'Target',
  color text not null default '#6366f1',
  target_minor bigint not null check (target_minor > 0),
  current_minor bigint not null default 0 check (current_minor >= 0),
  target_date date,
  monthly_contribution_minor bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'tip' check (type in ('tip', 'warning', 'forecast', 'achievement')),
  category_id uuid references public.categories(id) on delete set null,
  supporting_data jsonb,
  dismissed boolean not null default false,
  helpful boolean,
  generated_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on public.transactions(user_id, date desc);
create index if not exists transactions_user_category_idx on public.transactions(user_id, category_id);
create index if not exists budgets_user_idx on public.budgets(user_id);
create index if not exists savings_goals_user_idx on public.savings_goals(user_id);
create index if not exists recurring_transactions_user_due_idx on public.recurring_transactions(user_id, next_due_date);
create index if not exists ai_insights_user_generated_idx on public.ai_insights(user_id, generated_at desc);

-- Keep updated_at current on profile, transaction, budget, and goal edits.
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_profile_set_updated_at on public.users_profile;
create trigger users_profile_set_updated_at before update on public.users_profile
  for each row execute function public.set_updated_at();
drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();
drop trigger if exists savings_goals_set_updated_at on public.savings_goals;
create trigger savings_goals_set_updated_at before update on public.savings_goals
  for each row execute function public.set_updated_at();

alter table public.users_profile enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.ai_insights enable row level security;

drop policy if exists "profile owner can read" on public.users_profile;
create policy "profile owner can read" on public.users_profile for select to authenticated using (id = (select auth.uid()));
drop policy if exists "profile owner can insert" on public.users_profile;
create policy "profile owner can insert" on public.users_profile for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "profile owner can update" on public.users_profile;
create policy "profile owner can update" on public.users_profile for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "categories visible to all signed in users" on public.categories;
create policy "categories visible to all signed in users" on public.categories for select to authenticated using (user_id is null or user_id = (select auth.uid()));
drop policy if exists "users manage their own categories" on public.categories;
create policy "users manage their own categories" on public.categories for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "users manage their own transactions" on public.transactions;
create policy "users manage their own transactions" on public.transactions for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "users manage their own budgets" on public.budgets;
create policy "users manage their own budgets" on public.budgets for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "users manage their own savings goals" on public.savings_goals;
create policy "users manage their own savings goals" on public.savings_goals for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "users manage their own recurring transactions" on public.recurring_transactions;
create policy "users manage their own recurring transactions" on public.recurring_transactions for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "users manage their own ai insights" on public.ai_insights;
create policy "users manage their own ai insights" on public.ai_insights for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

insert into public.categories (user_id, name, icon, color, type, sort_order) values
  (null, 'Food & Dining', 'Utensils', '#f97316', 'expense', 1),
  (null, 'Transport', 'Car', '#3b82f6', 'expense', 2),
  (null, 'Shopping', 'ShoppingBag', '#a855f7', 'expense', 3),
  (null, 'Bills & Utilities', 'Zap', '#eab308', 'expense', 4),
  (null, 'Entertainment', 'Clapperboard', '#ec4899', 'expense', 5),
  (null, 'Health', 'HeartPulse', '#ef4444', 'expense', 6),
  (null, 'Travel', 'Plane', '#06b6d4', 'expense', 7),
  (null, 'Other Expense', 'CircleEllipsis', '#64748b', 'expense', 8),
  (null, 'Salary', 'BriefcaseBusiness', '#22c55e', 'income', 1),
  (null, 'Investment', 'ChartNoAxesCombined', '#14b8a6', 'income', 2),
  (null, 'Other Income', 'CircleDollarSign', '#6366f1', 'income', 3)
on conflict (name, type) where user_id is null do nothing;

-- Create a profile for new signups; existing profiles are never overwritten.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users_profile (id, display_name, avatar_url)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.users_profile (id, display_name, avatar_url)
select id, nullif(raw_user_meta_data ->> 'full_name', ''), nullif(raw_user_meta_data ->> 'avatar_url', '')
from auth.users
on conflict (id) do nothing;
